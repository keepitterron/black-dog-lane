// The validator: proves a level can be finished, can't get stuck, and follows the design rules
// (docs/handoff.md → Validator and solver). Builds on one solver graph and reports only codes,
// chapter ids, opaque ids and counts, never level content.
import { test } from '../engine/conditions.ts'
import { CATALOG, ICON_IDS, isAssetId, isPaletteId, paramProblems } from '../catalog/assets.ts'
import { MIN_TAP_UNITS, padRect, SCENE_H, SCENE_W, type Rect } from '../engine/layout.ts'
import { lookup } from '../engine/lookup.ts'
import { checkRefs, type RefCode } from '../engine/refs.ts'
import { parseLevel, type Chapter, type Hotspot, type Level, type Room } from '../engine/schema.ts'
import type { GameState } from '../engine/state.ts'
import { explore, shortestPath, type Graph, type Node, type Via } from './solve.ts'

// `play` is the strict profile every real level must pass. `fixture` is for hand-built test
// levels and skips the pacing checks.
export type Profile = 'play' | 'fixture'

// The design-rule checks, each with a broken fixture in levels/test/broken/.
export const CHECK_CODES = [
  'UNSOLVABLE',
  'DEAD_END',
  'CHAPTER_COUNT',
  'ORPHAN_HOTSPOT',
  'FALSE_CLUE',
  'HINT_GAP',
  'SECRET_NO_TELL',
  'TAP_TARGET',
  'BEAT_LOST',
  'ONE_WAY_DOOR',
  'ROOM_UNREACHABLE',
  'NO_PAYOFF',
  'LENGTH',
  'SINGLE_THREAD',
  'SINGLE_SOURCE',
  'BUSYWORK',
  'BEAT_SPARSE',
  'ASSET_REF',
] as const
// Hand-built fixtures (the Waiting Room) keep description-only taps and per-chapter room
// copies, so the rules about what a tap or a clue must lead to only bind real levels.
const PLAY_ONLY = new Set<Code>(['ORPHAN_HOTSPOT', 'FALSE_CLUE', 'LENGTH', 'SINGLE_THREAD', 'SINGLE_SOURCE', 'BUSYWORK', 'BEAT_SPARSE', 'NO_PAYOFF'])

// CORRUPT: the file isn't JSON or doesn't decode. SCHEMA: it doesn't parse (ids are dot
// paths). TRUNCATED: the search hit its state cap, so nothing can be proved.
export type Code = (typeof CHECK_CODES)[number] | RefCode | 'CORRUPT' | 'SCHEMA' | 'TRUNCATED'

export type Finding = { code: Code; chapter?: string; ids: string[] }

export type Stats = {
  chapters: number
  steps: number
  chapterSteps: number[]
  threads: [min: number, max: number]
  secrets: number
  beats: number
  states: number
}

export type ValidateReport = { ok: boolean; codes: Finding[]; stats: Stats | null }

export const LENGTH_RANGE = [12, 25] as const

type Step = { from: Node; via: Via; to: Node }

export function validate(input: unknown, { profile = 'play', maxStates = 100_000 }: { profile?: Profile; maxStates?: number } = {}): ValidateReport {
  const chapters: unknown = typeof input === 'object' && input !== null ? Reflect.get(input, 'chapters') : undefined
  if (Array.isArray(chapters) && chapters.length !== 3) return fail([{ code: 'CHAPTER_COUNT', ids: [] }])
  const parsed = parseLevel(input)
  if (!parsed.ok) return fail(parsed.issues.map(issue => ({ code: 'SCHEMA', ids: [issue.path] })))
  const { level } = parsed
  const refs = checkRefs(level)
  if (refs.length) return fail(refs.map(issue => ({ code: issue.code, ids: issue.ids })))

  const graph = explore(level, { maxStates })
  const path = shortestPath(graph)
  const byChapter = level.chapters.map(ch => path.filter(s => s.from.state.location.chapter === ch.id))
  const codes: Finding[] = []
  const add = (code: Code, ids: string[], chapter?: string) => {
    if (profile === 'fixture' && PLAY_ONLY.has(code)) return
    codes.push({ code, ids, ...(chapter ? { chapter } : {}) })
  }

  if (graph.truncated) add('TRUNCATED', [])
  if (!graph.goal) add('UNSOLVABLE', [])
  if (!graph.truncated) deadEnds(level, graph, add)
  orphans(level, graph, add)
  falseClues(level, add)
  hintGaps(level, graph, add)
  secretTells(level, add)
  tapTargets(level, graph, add)
  oneWayDoors(level, add)
  assetRefs(level, add)
  if (!graph.truncated) unreachableRooms(level, graph, add)
  for (const ch of level.chapters.slice(0, -1)) if (!ch.outro) add('NO_PAYOFF', [ch.id], ch.id)
  for (const id of graph.lostBeats) add('BEAT_LOST', [id], lookup(level).beats.get(id)?.chapter.id)
  for (const ch of level.chapters) for (const p of ch.puzzles) if (p.clues.length < 2) add('SINGLE_SOURCE', [p.id], ch.id)

  const threads: number[] = []
  let beats = 0
  if (graph.goal) {
    level.chapters.forEach((ch, i) => {
      const steps = byChapter[i] ?? []
      if (steps.length < LENGTH_RANGE[0] || steps.length > LENGTH_RANGE[1]) add('LENGTH', [ch.id], ch.id)
      const open = steps.map(s => openObjectives(ch, s.from.state))
      threads.push(...open)
      if (open.filter(n => n < 2).length * 2 > open.length) add('SINGLE_THREAD', [ch.id], ch.id)
      // The same tap (same hotspot, same item) needed twice: which order BFS picks for
      // independent steps is arbitrary, so this doesn't ask for the taps to be adjacent.
      const taps = new Set<string>()
      for (const { via } of steps) {
        if (via.kind !== 'hotspot') continue
        const tap = `${via.id} ${via.item ?? ''}`
        if (taps.has(tap)) add('BUSYWORK', [via.id], ch.id)
        taps.add(tap)
      }
      const seen = beatsSeen(ch, steps)
      beats += seen
      if (seen * 3 < steps.length) add('BEAT_SPARSE', [ch.id], ch.id)
    })
  }

  const stats: Stats = {
    chapters: level.chapters.length,
    steps: path.length,
    chapterSteps: byChapter.map(steps => steps.length),
    threads: threads.length ? [Math.min(...threads), Math.max(...threads)] : [0, 0],
    secrets: level.secrets.length,
    beats,
    states: graph.nodes.size,
  }
  return { ok: codes.length === 0, codes: dedupe(codes), stats }
}

const fail = (codes: Finding[]): ValidateReport => ({ ok: false, codes, stats: null })

function dedupe(codes: Finding[]): Finding[] {
  const seen = new Set<string>()
  return codes.filter(f => {
    const k = JSON.stringify([f.code, f.chapter, f.ids])
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

type Add = (code: Code, ids: string[], chapter?: string) => void

// Every view of a chapter with its id, so checks can walk hotspots with their view.
function views(chapter: Chapter) {
  return chapter.rooms.flatMap(room => [
    ...(['n', 'e', 's', 'w'] as const).map(w => ({ id: `${room.id}/${w}`, view: room.walls[w] })),
    ...Object.entries(room.closeUps).map(([id, view]) => ({ id, view })),
  ])
}

const clueViews = (level: Level) => new Set(level.chapters.flatMap(ch => ch.puzzles.flatMap(p => p.clues)))

const openObjectives = (chapter: Chapter, state: GameState) =>
  chapter.objectives.filter(o => test(o.availableWhen, state) && !test(o.doneWhen, state)).length

function deadEnds(level: Level, graph: Graph, add: Add): void {
  const stuck = new Set<string>()
  for (const [k, node] of graph.nodes) if (!graph.canFinish.has(k)) stuck.add(node.state.location.chapter)
  // Without any ending every state is stuck; UNSOLVABLE already says so.
  if (!graph.goal) return
  for (const ch of level.chapters) if (stuck.has(ch.id)) add('DEAD_END', [ch.id], ch.id)
}

// A hotspot that can be tapped but never changes the abstract state on any explored path.
// Allowed anyway: taps that only describe a clue (tagged `looksLikeClue` or in a puzzle's clue
// view), and taps that open a close-up or go to a room with something in it (location isn't
// part of the solver's state, so navigating never changes it).
function orphans(level: Level, graph: Graph, add: Add): void {
  const idx = lookup(level)
  const clues = clueViews(level)
  const states = [...graph.nodes.values()].map(n => n.state)
  const worthVisiting = (viewId: string) => {
    const view = idx.views.get(viewId)?.view
    return clues.has(viewId) || Boolean(view && (view.hotspots.length || view.puzzle))
  }
  for (const ch of level.chapters) {
    const inChapter = states.filter(s => s.location.chapter === ch.id && !s.ended)
    for (const { id: viewId, view } of views(ch)) {
      for (const hotspot of view.hotspots) {
        if (graph.usedHotspots.has(hotspot.id)) continue
        if (!inChapter.some(s => test(hotspot.visibleWhen, s))) continue
        const effects = hotspot.rules.flatMap(r => r.do)
        const describesClue = effects.every(e => e.do === 'say' || e.do === 'sound') && (hotspot.looksLikeClue === true || clues.has(viewId))
        const navigates = effects.some(
          e =>
            (e.do === 'open' && worthVisiting(e.view)) ||
            (e.do === 'goto' && (['n', 'e', 's', 'w'] as const).some(w => worthVisiting(`${e.room}/${w}`))),
        )
        if (!describesClue && !navigates) add('ORPHAN_HOTSPOT', [hotspot.id], ch.id)
      }
    }
  }
}

// A door that is always there and always leads on: no `visibleWhen`, and its first rule has no
// condition and a `goto`.
function openDoors(room: Room): string[] {
  return [...Object.values(room.walls), ...Object.values(room.closeUps)].flatMap(view =>
    view.hotspots.flatMap(h => {
      const [first] = h.rules
      if (h.visibleWhen || !first || first.when) return []
      return first.do.flatMap(e => (e.do === 'goto' ? [e.room] : []))
    }),
  )
}

// Every door, gated or not, must have a way back through doors that are always open: the solver
// assumes the player can always return to a room they reached.
function oneWayDoors(level: Level, add: Add): void {
  for (const ch of level.chapters) {
    const open = new Map(ch.rooms.map(room => [room.id, openDoors(room)]))
    const reaches = (from: string, to: string) => {
      const seen = new Set([from])
      const stack = [from]
      while (stack.length > 0) {
        const at = stack.pop() ?? ''
        if (at === to) return true
        for (const next of open.get(at) ?? []) {
          if (seen.has(next)) continue
          seen.add(next)
          stack.push(next)
        }
      }
      return false
    }
    for (const room of ch.rooms)
      for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)])
        for (const h of view.hotspots)
          for (const e of h.rules.flatMap(r => r.do)) if (e.do === 'goto' && !reaches(e.room, room.id)) add('ONE_WAY_DOOR', [h.id], ch.id)
  }
}

// A room no door ever leads to. Chapters the search never entered are UNSOLVABLE already.
function unreachableRooms(level: Level, graph: Graph, add: Add): void {
  const entered = new Set([...graph.nodes.values()].map(n => n.state.location.chapter))
  for (const ch of level.chapters) {
    if (!entered.has(ch.id)) continue
    for (const room of ch.rooms) if (!graph.reachedRooms.has(room.id)) add('ROOM_UNREACHABLE', [room.id], ch.id)
  }
}

function falseClues(level: Level, add: Add): void {
  const clues = clueViews(level)
  for (const ch of level.chapters)
    for (const { id, view } of views(ch))
      for (const hotspot of view.hotspots) if (hotspot.looksLikeClue && !clues.has(id)) add('FALSE_CLUE', [hotspot.id], ch.id)
}

// Art the catalog can't draw: an unknown asset, palette or icon, params the asset doesn't
// take, a slot it can't stand in, a puzzle param naming no puzzle, or a close-up drawn on a
// wall. Ids are the view (or item) plus the asset id or the offending param.
function assetRefs(level: Level, add: Add): void {
  if (!isPaletteId(level.palette)) add('ASSET_REF', ['palette'])
  const icons: readonly string[] = ICON_IDS
  for (const [id, item] of Object.entries(level.items)) if (!icons.includes(item.icon)) add('ASSET_REF', [id, 'icon'])
  const idx = lookup(level)
  for (const ch of level.chapters)
    for (const { id, view } of views(ch))
      for (const layer of view.layers) {
        if (!isAssetId(layer.asset)) {
          add('ASSET_REF', [id, layer.asset], ch.id)
          continue
        }
        const params = layer.params ?? {}
        const problems = paramProblems(layer.asset, params)
        const specs = CATALOG[layer.asset].params
        for (const [key, spec] of Object.entries(specs)) {
          const value = params[key]
          if (spec.type === 'puzzle' && value !== undefined && !idx.puzzles.has(String(value))) problems.push(`puzzle:${key}`)
        }
        if (CATALOG[layer.asset].kind === 'closeUp' && id.includes('/')) problems.push('kind')
        for (const problem of problems) add('ASSET_REF', [id, layer.asset, problem], ch.id)
      }
}

function hintGaps(level: Level, graph: Graph, add: Add): void {
  const gaps = new Set<string>()
  for (const node of graph.nodes.values()) {
    if (node.state.ended) continue
    const chapter = lookup(level).chapters.get(node.state.location.chapter)?.chapter
    if (chapter && openObjectives(chapter, node.state) === 0) gaps.add(chapter.id)
  }
  for (const ch of level.chapters) if (gaps.has(ch.id)) add('HINT_GAP', [ch.id], ch.id)
}

// A secret's tell layer must look different: it appears on a condition, reacts to a flag, or
// has params that differ from another layer of the same asset in its view.
function secretTells(level: Level, add: Add): void {
  const idx = lookup(level)
  for (const secret of level.secrets) {
    const entry = idx.views.get(secret.tell.view)
    const layer = entry?.view.layers.find(l => l.id === secret.tell.layer)
    if (!entry || !layer) continue
    const told =
      layer.visibleWhen !== undefined ||
      Object.keys(layer.params ?? {}).some(p => p.endsWith('Flag')) ||
      entry.view.layers.some(l => l !== layer && l.asset === layer.asset && JSON.stringify(l.params ?? {}) !== JSON.stringify(layer.params ?? {}))
    if (!told) add('SECRET_NO_TELL', [secret.id], entry.chapter.id)
  }
}

// Padded tap targets must stay inside the scene, and hotspots drawn on top of one (later in
// the list, and visible at the same time) must leave it at least half a minimum tap target
// of free area. Nesting a small target on a big one is fine; burying one is not.
const MIN_FREE_AREA = MIN_TAP_UNITS ** 2 / 2

function tapTargets(level: Level, graph: Graph, add: Add): void {
  const states = [...graph.nodes.values()].map(n => n.state)
  for (const ch of level.chapters) {
    const inChapter = states.filter(s => s.location.chapter === ch.id && !s.ended)
    for (const { view } of views(ch)) {
      const spots = view.hotspots.map(h => ({ h, rect: padRect(h.rect) }))
      spots.forEach(({ h, rect }, i) => {
        const [x, y, w, hh] = rect
        if (x < 0 || y < 0 || x + w > SCENE_W || y + hh > SCENE_H) return add('TAP_TARGET', [h.id], ch.id)
        const above = spots.slice(i + 1).filter(o => overlaps(rect, o.rect) && coVisible(h, o.h, inChapter))
        if (above.length && freeArea(rect, above.map(o => o.rect)) < MIN_FREE_AREA) add('TAP_TARGET', [h.id, ...above.map(o => o.h.id)], ch.id)
      })
    }
  }
}

const overlaps = ([ax, ay, aw, ah]: Rect, [bx, by, bw, bh]: Rect) => ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah

// Area of `rect` not covered by any of `covers`, sampled on a 2-unit grid.
function freeArea([x, y, w, h]: Rect, covers: Rect[]): number {
  let free = 0
  for (let px = x + 1; px < x + w; px += 2)
    for (let py = y + 1; py < y + h; py += 2)
      if (!covers.some(([cx, cy, cw, ch]) => px >= cx && px < cx + cw && py >= cy && py < cy + ch)) free += 4
  return free
}

function coVisible(a: Hotspot, b: Hotspot, states: GameState[]): boolean {
  if (!a.visibleWhen && !b.visibleWhen) return true
  return states.some(s => test(a.visibleWhen, s) && test(b.visibleWhen, s))
}

// Beats a player sees along the shortest path: those fired by a step, plus arrive and leave
// beats whose condition holds at some point (they only print and play, so the search never
// needs to take them).
function beatsSeen(chapter: Chapter, steps: Step[]): number {
  const seen = new Set<string>()
  for (const { from, to } of steps) for (const id of to.state.fired) if (!from.state.fired.includes(id)) seen.add(id)
  for (const beat of chapter.beats) {
    if (beat.on.type === 'afterFlag' || seen.has(beat.id)) continue
    const { when } = beat.on
    if (steps.some(s => test(when, s.from.state) || test(when, s.to.state))) seen.add(beat.id)
  }
  return chapter.beats.filter(b => seen.has(b.id)).length
}
