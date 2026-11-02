// Saves are keyed by level id and carry the save schema version. Storage is passed in (the
// browser's localStorage in the app), and every access is guarded: private windows and full
// disks throw, and a broken save must never stop the game from starting.
import * as v from 'valibot'
import { lookup } from './lookup.ts'
import type { Level } from './schema.ts'
import { GameState, SAVE_VERSION } from './state.ts'

export type SaveStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'ok'; state: GameState }
  // Saved by another save version or an older copy of the level: offer Start over.
  | { kind: 'mismatch' }

export const saveKey = (levelId: string) => `bdl:save:${levelId}`

export function saveGame(store: SaveStore, state: GameState): boolean {
  try {
    store.setItem(saveKey(state.levelId), JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function loadGame(store: SaveStore, level: Level): LoadResult {
  let raw: string | null
  try {
    raw = store.getItem(saveKey(level.id))
  } catch {
    return { kind: 'none' }
  }
  if (raw === null) return { kind: 'none' }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { kind: 'mismatch' }
  }
  const parsed = v.safeParse(GameState, data)
  if (!parsed.success) return { kind: 'mismatch' }
  const state = parsed.output
  const idx = lookup(level)
  const fits =
    state.version === SAVE_VERSION &&
    state.levelId === level.id &&
    idx.rooms.get(state.location.room)?.chapter.id === state.location.chapter &&
    state.location.closeUps.every(id => idx.views.get(id)?.room.id === state.location.room)
  return fits ? { kind: 'ok', state } : { kind: 'mismatch' }
}

export function clearSave(store: SaveStore, levelId: string): void {
  try {
    store.removeItem(saveKey(levelId))
  } catch {
    // Nothing to do: the next save overwrites it anyway.
  }
}
