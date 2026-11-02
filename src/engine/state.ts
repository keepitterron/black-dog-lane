import * as v from 'valibot'
import { Id, WALLS, type Level } from './schema.ts'

// Bump when GameState changes shape; older saves then offer "Start over" instead of loading.
export const SAVE_VERSION = 1

export const GameState = v.strictObject({
  version: v.literal(SAVE_VERSION),
  levelId: Id,
  location: v.strictObject({
    chapter: Id,
    room: Id,
    wall: v.picklist(WALLS),
    // Open close-ups, innermost last. Back pops one.
    closeUps: v.array(Id),
  }),
  inventory: v.array(Id),
  // An item id, the dog slot, or nothing.
  selected: v.nullable(Id),
  flags: v.record(v.string(), v.union([v.boolean(), v.number(), v.string()])),
  // Beats and dog moments that already ran.
  fired: v.array(Id),
  hint: v.strictObject({ objective: v.nullable(Id), tier: v.picklist([0, 1, 2]) }),
  ended: v.nullable(Id),
})
export type GameState = v.InferOutput<typeof GameState>

export function newGame(level: Level): GameState {
  const [first] = level.chapters
  return {
    version: SAVE_VERSION,
    levelId: level.id,
    location: { chapter: first.id, room: first.start.room, wall: first.start.wall, closeUps: [] },
    inventory: [],
    selected: null,
    flags: {},
    fired: [],
    hint: { objective: null, tier: 0 },
    ended: null,
  }
}
