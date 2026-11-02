// Id → object maps for a level, built once per level object.
import { WALLS, type Beat, type Chapter, type Level, type Puzzle, type Room, type View, type Wall } from './schema.ts'

export type ViewEntry = { id: string; view: View; room: Room; chapter: Chapter; wall: Wall | null }

export type LevelIndex = {
  chapters: Map<string, { chapter: Chapter; index: number }>
  rooms: Map<string, { room: Room; chapter: Chapter }>
  views: Map<string, ViewEntry>
  beats: Map<string, { beat: Beat; chapter: Chapter }>
  puzzles: Map<string, { puzzle: Puzzle; chapter: Chapter }>
}

export const wallViewId = (room: string, wall: Wall) => `${room}/${wall}`

const cache = new WeakMap<Level, LevelIndex>()

export function lookup(level: Level): LevelIndex {
  const hit = cache.get(level)
  if (hit) return hit
  const index: LevelIndex = { chapters: new Map(), rooms: new Map(), views: new Map(), beats: new Map(), puzzles: new Map() }
  level.chapters.forEach((chapter, i) => {
    index.chapters.set(chapter.id, { chapter, index: i })
    for (const room of chapter.rooms) {
      index.rooms.set(room.id, { room, chapter })
      for (const wall of WALLS) {
        const id = wallViewId(room.id, wall)
        index.views.set(id, { id, view: room.walls[wall], room, chapter, wall })
      }
      for (const [id, view] of Object.entries(room.closeUps)) index.views.set(id, { id, view, room, chapter, wall: null })
    }
    for (const beat of chapter.beats) index.beats.set(beat.id, { beat, chapter })
    for (const puzzle of chapter.puzzles) index.puzzles.set(puzzle.id, { puzzle, chapter })
  })
  cache.set(level, index)
  return index
}
