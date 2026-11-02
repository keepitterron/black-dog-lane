// Breadth-first search over abstract game states (chapter + flags + inventory + fired),
// driving the real engine. Location is abstracted away: every view of a room counts as
// reachable once a door leads there from the chapter's start (doors whose rule would fire in
// that state). The validator's ONE_WAY_DOOR check makes sure the way back is always open, so
// where the player stands never matters. Reports numbers only, never level content.
import { seenFlag, test } from '../engine/conditions.ts'
import { lookup } from '../engine/lookup.ts'
import { isSolved } from '../engine/puzzles.ts'
import type { Chapter, Level, Wall } from '../engine/schema.ts'
import { newGame, type GameState } from '../engine/state.ts'
import { step, type Action } from '../engine/step.ts'
import { solutionInputs } from './puzzleInputs.ts'

export type SolveReport = {
  solvable: boolean
  // Fewest state-changing actions from start to an ending.
  shortest: number | null
  states: number
  // Reachable states from which no ending can be reached any more.
  deadEnds: number
  truncated: boolean
  // A few dead-end states, for debugging test levels only (never print real levels).
  deadEndSamples?: GameState[]
}

// What a solver step did: tap a hotspot (maybe with an item), solve a puzzle, combine two
// items, look at a view (arrive) or leave one (turn or back).
export type Via =
  | { kind: 'hotspot'; id: string; item?: string }
  | { kind: 'puzzle'; id: string }
  | { kind: 'combine'; a: string; b: string }
  | { kind: 'look'; view: string }
  | { kind: 'leave'; view: string }

export type Node = { key: string; state: GameState; depth: number; parent: string | null; via: Via | null }
export type Edge = { to: string; via: Via }

export type Graph = {
  start: string
  nodes: Map<string, Node>
  // State-changing steps only: an action that leaves the abstract state as it was isn't an edge.
  edges: Map<string, Edge[]>
  // The first ending found, so the parent chain from it is a shortest path.
  goal: string | null
  // States from which an ending can still be reached.
  canFinish: Set<string>
  truncated: boolean
  // `afterFlag` beats that were due when a step ended their chapter, so they never fired.
  lostBeats: Set<string>
  // Hotspots that changed the state at least once (edges keep one step per target, so a
  // hotspot that does the same as another wouldn't show up in them).
  usedHotspots: Set<string>
  // Rooms reachable through doors in at least one explored state.
  reachedRooms: Set<string>
}

// What can change how the game plays from here: flags read by gameplay conditions (not by
// art, hints or secrets), puzzle state, the inventory, and beats whose firing
// matters (they change state, or a condition asks whether they fired). States that agree on
// all of these play the same, so the search treats them as one.
type Relevance = { flags: Set<string>; prefixes: string[]; fired: Set<string> }

const changesState = (effects: readonly { do: string }[]) => effects.some(e => !['say', 'sound'].includes(e.do))

function relevance(level: Level): Relevance {
  const flags = new Set<string>()
  const fired = new Set<string>()
  const conds = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(conds)
    if (typeof value !== 'object' || value === null) return
    const op: unknown = Reflect.get(value, 'op')
    const name: unknown = Reflect.get(value, op === 'seen' ? 'view' : op === 'fired' ? 'id' : 'flag')
    if (typeof name === 'string') {
      if (op === 'flag') flags.add(name)
      if (op === 'seen') flags.add(seenFlag(name))
      if (op === 'fired') fired.add(name)
    }
    Object.values(value).forEach(conds)
  }
  conds(level.endings)
  for (const chapter of level.chapters) {
    conds(chapter.exitWhen)
    for (const room of chapter.rooms) for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)]) conds(view.hotspots)
    for (const beat of chapter.beats) {
      conds(beat.on)
      if (beat.on.type === 'afterFlag') flags.add(beat.on.flag)
      if (changesState(beat.do)) fired.add(beat.id)
    }
    for (const puzzle of chapter.puzzles) {
      conds(puzzle.activeWhen)
      for (const view of puzzle.clues) flags.add(seenFlag(view))
    }
  }
  return { flags, prefixes: level.chapters.flatMap(ch => ch.puzzles.map(p => `${p.id}:`)), fired }
}

const keyOf = (r: Relevance) => (s: GameState) =>
  JSON.stringify([
    s.location.chapter,
    Object.entries(s.flags)
      .filter(([f]) => r.flags.has(f) || r.prefixes.some(p => f.startsWith(p)))
      .toSorted(([a], [b]) => (a < b ? -1 : 1)),
    s.inventory.toSorted(),
    s.fired.filter(id => r.fired.has(id)).toSorted(),
    s.ended,
  ])

export function explore(level: Level, { maxStates = 100_000 } = {}): Graph {
  const key = keyOf(relevance(level))
  const start = newGame(level)
  const startKey = key(start)
  const nodes = new Map<string, Node>([[startKey, { key: startKey, state: start, depth: 0, parent: null, via: null }]])
  const edges = new Map<string, Edge[]>()
  const lostBeats = new Set<string>()
  const usedHotspots = new Set<string>()
  const reachedRooms = new Set<string>()
  const queue: string[] = [startKey]
  let goal: string | null = null
  let truncated = false

  for (let head = 0; head < queue.length; head++) {
    const k = queue[head] ?? ''
    const node = nodes.get(k)
    if (!node || node.state.ended) continue
    const out = new Map<string, Edge>()
    const chapter = lookup(level).chapters.get(node.state.location.chapter)?.chapter
    const rooms = chapter ? reachableRooms(level, chapter, node.state) : new Set<string>()
    for (const room of rooms) reachedRooms.add(room)
    for (const { state: next, via, solverGaveUp } of successors(level, node.state, rooms)) {
      if (solverGaveUp) truncated = true
      const nk = key(next)
      if (nk === k) continue
      if (via.kind === 'hotspot') usedHotspots.add(via.id)
      if (next.location.chapter !== node.state.location.chapter || next.ended) lostAfterExit(level, node.state, next, lostBeats)
      // One edge per target is enough; the first found is also the one BFS keeps as parent.
      if (!out.has(nk)) out.set(nk, { to: nk, via })
      if (nodes.has(nk)) continue
      if (nodes.size >= maxStates) {
        truncated = true
        continue
      }
      nodes.set(nk, { key: nk, state: next, depth: node.depth + 1, parent: k, via })
      if (next.ended) goal ??= nk
      else queue.push(nk)
    }
    edges.set(k, [...out.values()])
  }

  // Walk backwards from every ending to find the states that can still finish.
  const reverse = new Map<string, string[]>()
  for (const [from, out] of edges) for (const { to } of out) reverse.set(to, [...(reverse.get(to) ?? []), from])
  const canFinish = new Set([...nodes].filter(([, n]) => n.state.ended).map(([k]) => k))
  const stack = [...canFinish]
  while (stack.length > 0) {
    for (const prev of reverse.get(stack.pop() ?? '') ?? []) {
      if (canFinish.has(prev)) continue
      canFinish.add(prev)
      stack.push(prev)
    }
  }
  return { start: startKey, nodes, edges, goal, canFinish, truncated, lostBeats, usedHotspots, reachedRooms }
}

// The steps from the start to the first ending found, in order.
export function shortestPath(graph: Graph): { from: Node; via: Via; to: Node }[] {
  const steps: { from: Node; via: Via; to: Node }[] = []
  for (let to = graph.goal ? graph.nodes.get(graph.goal) : undefined; to?.parent && to.via; ) {
    const from = graph.nodes.get(to.parent)
    if (!from) break
    steps.push({ from, via: to.via, to })
    to = from
  }
  return steps.toReversed()
}

export function solve(level: Level, { maxStates = 100_000, samples = 0 } = {}): SolveReport {
  const graph = explore(level, { maxStates })
  const goal = graph.goal ? graph.nodes.get(graph.goal) : undefined
  const dead = graph.truncated ? [] : [...graph.nodes].filter(([k]) => !graph.canFinish.has(k)).map(([, n]) => n.state)
  return {
    solvable: goal !== undefined,
    shortest: goal?.depth ?? null,
    states: graph.nodes.size,
    deadEnds: dead.length,
    truncated: graph.truncated,
    ...(samples > 0 ? { deadEndSamples: dead.slice(0, samples) } : {}),
  }
}

// When a step leaves a chapter, `afterFlag` beats of that chapter that were due on a flag the
// step changed never get to fire (the engine settles beats in the new chapter).
function lostAfterExit(level: Level, from: GameState, to: GameState, lost: Set<string>): void {
  const chapter = lookup(level).chapters.get(from.location.chapter)?.chapter
  for (const beat of chapter?.beats ?? []) {
    const { on } = beat
    if (on.type !== 'afterFlag' || to.fired.includes(beat.id)) continue
    if (from.flags[on.flag] === to.flags[on.flag]) continue
    if (test(on.when, to)) lost.add(beat.id)
  }
}

type Successor = { state: GameState; via: Via; solverGaveUp?: true }

// The rooms a door leads to from `room` right now: visible hotspots in any of its views whose
// rule that would fire (the first whose condition holds, as in the engine) has a `goto`.
export function doorsOut(level: Level, roomId: string, state: GameState): string[] {
  const room = lookup(level).rooms.get(roomId)?.room
  if (!room) return []
  const targets: string[] = []
  for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)])
    for (const hotspot of view.hotspots) {
      if (!test(hotspot.visibleWhen, state)) continue
      const rule = hotspot.rules.find(r => test(r.when, state))
      for (const effect of rule?.do ?? []) if (effect.do === 'goto') targets.push(effect.room)
    }
  return targets
}

export function reachableRooms(level: Level, chapter: Chapter, state: GameState): Set<string> {
  const reached = new Set([chapter.start.room])
  const stack = [chapter.start.room]
  while (stack.length > 0)
    for (const next of doorsOut(level, stack.pop() ?? '', state)) {
      if (reached.has(next)) continue
      reached.add(next)
      stack.push(next)
    }
  return reached
}

function successors(level: Level, from: GameState, rooms: Set<string>): Successor[] {
  const idx = lookup(level)
  const chapter = idx.chapters.get(from.location.chapter)?.chapter
  if (!chapter) return []
  const results: Successor[] = []
  const run = (at: GameState, via: Via, actions: Action[]) => {
    let state = at
    for (const action of actions) state = step(level, state, action).state
    results.push({ state: { ...state, selected: null, hint: { objective: null, tier: 0 } }, via })
  }
  const items = [...from.inventory]

  for (const room of chapter.rooms) {
    if (!rooms.has(room.id)) continue
    const views: [string, Wall, string[]][] = [
      ...(['n', 'e', 's', 'w'] as const).map(w => [`${room.id}/${w}`, w, []] as [string, Wall, string[]]),
      ...Object.keys(room.closeUps).map(id => [id, 'n', [id]] as [string, Wall, string[]]),
    ]
    for (const [viewId, wall, closeUps] of views) {
      const view = idx.views.get(viewId)?.view
      if (!view) continue
      const at: GameState = { ...from, location: { chapter: chapter.id, room: room.id, wall, closeUps } }
      run(at, { kind: 'look', view: viewId }, [{ type: 'arrive' }])
      run(at, { kind: 'leave', view: viewId }, closeUps.length ? [{ type: 'back' }] : [{ type: 'turn', dir: 'right' }])
      if (!closeUps.length) run(at, { kind: 'leave', view: viewId }, [{ type: 'turn', dir: 'left' }])
      for (const hotspot of view.hotspots) {
        if (!test(hotspot.visibleWhen, at)) continue
        run(at, { kind: 'hotspot', id: hotspot.id }, [{ type: 'tapHotspot', id: hotspot.id }])
        for (const item of items) {
          if (!hotspot.accepts?.includes(item)) continue
          run({ ...at, selected: item }, { kind: 'hotspot', id: hotspot.id, item }, [{ type: 'tapHotspot', id: hotspot.id }])
        }
      }
      const puzzle = view.puzzle ? idx.puzzles.get(view.puzzle)?.puzzle : undefined
      // Solving needs the clues: every clue view must have been looked at first.
      if (puzzle && !isSolved(puzzle, at.flags) && puzzle.clues.every(clue => at.flags[seenFlag(clue)] === true)) {
        const inputs = solutionInputs(puzzle, at.flags)
        if (inputs === null) results.push({ state: from, via: { kind: 'puzzle', id: puzzle.id }, solverGaveUp: true })
        else if (inputs.length) run(at, { kind: 'puzzle', id: puzzle.id }, inputs.map(input => ({ type: 'puzzleInput', puzzle: puzzle.id, input })))
      }
    }
  }
  const anywhere: GameState = { ...from, location: { ...from.location, closeUps: [] } }
  for (const a of items) {
    for (const b of items) if (a < b) run({ ...anywhere, selected: a }, { kind: 'combine', a, b }, [{ type: 'tapItem', id: b }])
  }
  return results
}
