import { lookup, wallViewId, type LevelIndex } from './lookup.ts'
import type { Chapter, FlagValue, Level, SFX } from './schema.ts'
import type { GameState } from './state.ts'

// Engine errors name ids only, never level text (see the surprise protocol in CLAUDE.md).
export type EngineErrorCode =
  | 'UNKNOWN_HOTSPOT'
  | 'UNKNOWN_ITEM'
  | 'UNKNOWN_VIEW'
  | 'UNKNOWN_ROOM'
  | 'UNKNOWN_BEAT'
  | 'UNKNOWN_PUZZLE'
  | 'PUZZLE_NOT_IN_VIEW'
  | 'BAD_PUZZLE_INPUT'
  | 'EXIT_NOT_MET'

export type GameEvent =
  | { type: 'say'; text: string }
  | { type: 'give'; item: string }
  | { type: 'take'; item: string }
  | { type: 'sound'; sfx: (typeof SFX)[number] }
  | { type: 'beat'; id: string }
  | { type: 'hint'; objective: string; tier: 0 | 1 | 2; text: string }
  | { type: 'puzzleSolved'; puzzle: string }
  | { type: 'chapterEnd'; chapter: string }
  | { type: 'ending'; id: string; text: string; secretsFound: number; secretsTotal: number }
  | { type: 'error'; code: EngineErrorCode; ids: string[] }

// Mutable working copy for one step. `state` is a clone, so mutating it keeps step() pure.
export type Ctx = {
  level: Level
  idx: LevelIndex
  state: GameState
  events: GameEvent[]
  changed: Set<string>
}

export function makeCtx(level: Level, state: GameState): Ctx {
  return { level, idx: lookup(level), state: structuredClone(state), events: [], changed: new Set() }
}

export function emit(ctx: Ctx, event: GameEvent): void {
  ctx.events.push(event)
}

export function fail(ctx: Ctx, code: EngineErrorCode, ...ids: string[]): void {
  ctx.events.push({ type: 'error', code, ids })
}

export function setFlag(ctx: Ctx, flag: string, value: FlagValue): void {
  if (ctx.state.flags[flag] === value) return
  ctx.state.flags[flag] = value
  ctx.changed.add(flag)
}

export function currentChapter(ctx: Ctx): Chapter {
  const entry = ctx.idx.chapters.get(ctx.state.location.chapter)
  if (!entry) throw new Error(`state names unknown chapter ${ctx.state.location.chapter}`)
  return entry.chapter
}

export function currentViewId(state: GameState): string {
  const { room, wall, closeUps } = state.location
  return closeUps.at(-1) ?? wallViewId(room, wall)
}
