// Breadth-first search over abstract game states (chapter + flags + inventory + fired),
// driving the real engine. Location is abstracted away: any view in the chapter counts as
// reachable. Reports numbers only, never level content.
import { seenFlag, test } from '../engine/conditions.ts'
import { lookup } from '../engine/lookup.ts'
import { isSolved, type PuzzleInput } from '../engine/puzzles.ts'
import { clockTime, dialValues, progress } from '../engine/puzzles.ts'
import type { Level, Puzzle, Wall } from '../engine/schema.ts'
import { newGame, type GameState } from '../engine/state.ts'
import { step, type Action } from '../engine/step.ts'

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

type Node = { state: GameState; depth: number }

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

export function solve(level: Level, { maxStates = 100_000, samples = 0 } = {}): SolveReport {
  const key = keyOf(relevance(level))
  const start = newGame(level)
  const seen = new Map<string, Node>([[key(start), { state: start, depth: 0 }]])
  const edges = new Map<string, Set<string>>()
  const queue: string[] = [key(start)]
  let shortest: number | null = null
  let truncated = false

  while (queue.length > 0) {
    const k = queue.shift() ?? ''
    const node = seen.get(k)
    if (!node || node.state.ended) continue
    const out = new Set<string>()
    for (const next of successors(level, node.state)) {
      const nk = key(next)
      if (nk === k) continue
      out.add(nk)
      if (seen.has(nk)) continue
      if (seen.size >= maxStates) {
        truncated = true
        continue
      }
      seen.set(nk, { state: next, depth: node.depth + 1 })
      if (next.ended) shortest ??= node.depth + 1
      else queue.push(nk)
    }
    edges.set(k, out)
  }

  // Walk backwards from every ending to find the states that can still finish.
  const reverse = new Map<string, string[]>()
  for (const [from, tos] of edges) for (const to of tos) reverse.set(to, [...(reverse.get(to) ?? []), from])
  const canFinish = new Set([...seen].filter(([, n]) => n.state.ended).map(([k]) => k))
  const stack = [...canFinish]
  while (stack.length > 0) {
    for (const prev of reverse.get(stack.pop() ?? '') ?? []) {
      if (canFinish.has(prev)) continue
      canFinish.add(prev)
      stack.push(prev)
    }
  }

  const dead = truncated ? [] : [...seen].filter(([k]) => !canFinish.has(k)).map(([, n]) => n.state)
  return {
    solvable: shortest !== null,
    shortest,
    states: seen.size,
    deadEnds: dead.length,
    truncated,
    ...(samples > 0 ? { deadEndSamples: dead.slice(0, samples) } : {}),
  }
}

function successors(level: Level, from: GameState): GameState[] {
  const idx = lookup(level)
  const chapter = idx.chapters.get(from.location.chapter)?.chapter
  if (!chapter) return []
  const results: GameState[] = []
  const run = (at: GameState, actions: Action[]) => {
    let state = at
    for (const action of actions) state = step(level, state, action).state
    results.push({ ...state, selected: null, hint: { objective: null, tier: 0 } })
  }
  const items = [...from.inventory]

  for (const room of chapter.rooms) {
    const views: [string, Wall, string[]][] = [
      ...(['n', 'e', 's', 'w'] as const).map(w => [`${room.id}/${w}`, w, []] as [string, Wall, string[]]),
      ...Object.keys(room.closeUps).map(id => [id, 'n', [id]] as [string, Wall, string[]]),
    ]
    for (const [viewId, wall, closeUps] of views) {
      const view = idx.views.get(viewId)?.view
      if (!view) continue
      const at: GameState = { ...from, location: { chapter: chapter.id, room: room.id, wall, closeUps } }
      run(at, [{ type: 'arrive' }])
      run(at, closeUps.length ? [{ type: 'back' }] : [{ type: 'turn', dir: 'right' }])
      if (!closeUps.length) run(at, [{ type: 'turn', dir: 'left' }])
      for (const hotspot of view.hotspots) {
        if (!test(hotspot.visibleWhen, at)) continue
        run(at, [{ type: 'tapHotspot', id: hotspot.id }])
        for (const item of items) {
          if (!hotspot.accepts?.includes(item)) continue
          run({ ...at, selected: item }, [{ type: 'tapHotspot', id: hotspot.id }])
        }
      }
      const puzzle = view.puzzle ? idx.puzzles.get(view.puzzle)?.puzzle : undefined
      // Solving needs the clues: every clue view must have been looked at first.
      if (puzzle && !isSolved(puzzle, at.flags) && puzzle.clues.every(clue => at.flags[seenFlag(clue)] === true)) {
        const inputs = solutionInputs(puzzle, at)
        if (inputs.length) run(at, inputs.map(input => ({ type: 'puzzleInput', puzzle: puzzle.id, input })))
      }
    }
  }
  const anywhere: GameState = { ...from, location: { ...from.location, closeUps: [] } }
  for (const a of items) {
    for (const b of items) if (a < b) run({ ...anywhere, selected: a }, [{ type: 'tapItem', id: b }])
  }
  return results
}

// Inputs that take a puzzle from its current state to its declared solution.
function solutionInputs(puzzle: Puzzle, state: GameState): PuzzleInput[] {
  const inputs: PuzzleInput[] = []
  switch (puzzle.kind) {
    case 'dialLock': {
      dialValues(puzzle, state.flags).forEach((value, dial) => {
        const from = puzzle.symbols.indexOf(value)
        const to = puzzle.symbols.indexOf(puzzle.solution[dial] ?? '')
        const turns = (to - from + puzzle.symbols.length) % puzzle.symbols.length
        for (let i = 0; i < turns; i++) inputs.push({ kind: 'dial', dial, dir: 1 })
      })
      return inputs
    }
    case 'clockSet': {
      const now = clockTime(puzzle, state.flags)
      for (let i = 0; i < (puzzle.solution.h - now.h + 12) % 12; i++) inputs.push({ kind: 'clock', hand: 'h', dir: 1 })
      const minuteTurns = ((puzzle.solution.m - now.m + 60) % 60) / puzzle.minuteStep
      for (let i = 0; i < minuteTurns; i++) inputs.push({ kind: 'clock', hand: 'm', dir: 1 })
      return inputs
    }
    case 'sequence':
      return puzzle.solution.map(target => ({ kind: 'tap', target }))
    case 'trail':
      return puzzle.trail.slice(progress(puzzle, state.flags)).map(view => ({ kind: 'trail', view }))
    case 'slider':
    case 'pattern':
      // Not used by any level yet; the full validator (Milestone 5) will search these.
      return []
  }
}
