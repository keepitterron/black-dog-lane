import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel, play } from '../../tests/fixture.ts'
import { clearSave, loadGame, saveGame, saveKey, type SaveStore } from './save.ts'
import { newGame } from './state.ts'

function memoryStore(): SaveStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
  }
}

const brokenStore: SaveStore = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('quota')
  },
  removeItem: () => {
    throw new Error('blocked')
  },
}

function midGame() {
  const level = baseLevel()
  level.chapters[0].rooms[0]!.closeUps['cu'] = { layers: [], hotspots: [] }
  addHotspot(level, 'c1r/n', { id: 'h', rules: [{ do: [{ do: 'give', item: 'a' }, { do: 'setFlag', flag: 'n', value: 2 }, { do: 'open', view: 'cu' }] }] })
  const { state } = play(level, [{ type: 'arrive' }, { type: 'tapHotspot', id: 'h' }, { type: 'tapItem', id: 'a' }, { type: 'hint' }])
  return { level, state }
}

describe('saves', () => {
  test('a save round-trips exactly', () => {
    const { level, state } = midGame()
    const store = memoryStore()
    expect(saveGame(store, state)).toBe(true)
    expect(store.data.has(saveKey('fixture'))).toBe(true)
    expect(loadGame(store, level)).toEqual({ kind: 'ok', state })
  })

  test('no save loads as none; clearing removes it', () => {
    const level = baseLevel()
    const store = memoryStore()
    expect(loadGame(store, level)).toEqual({ kind: 'none' })
    saveGame(store, newGame(level))
    clearSave(store, level.id)
    expect(loadGame(store, level)).toEqual({ kind: 'none' })
  })

  test('another save version, corrupt JSON, or a save that no longer fits the level is a mismatch', () => {
    const { level, state } = midGame()
    const store = memoryStore()
    const key = saveKey(level.id)
    store.setItem(key, JSON.stringify({ ...state, version: 0 }))
    expect(loadGame(store, level)).toEqual({ kind: 'mismatch' })
    store.setItem(key, '{not json')
    expect(loadGame(store, level)).toEqual({ kind: 'mismatch' })
    store.setItem(key, JSON.stringify({ ...state, location: { ...state.location, room: 'gone' } }))
    expect(loadGame(store, level)).toEqual({ kind: 'mismatch' })
    store.setItem(key, JSON.stringify({ ...state, location: { ...state.location, closeUps: ['gone'] } }))
    expect(loadGame(store, level)).toEqual({ kind: 'mismatch' })
  })

  test('storage that throws never breaks the game', () => {
    const level = baseLevel()
    expect(saveGame(brokenStore, newGame(level))).toBe(false)
    expect(loadGame(brokenStore, level)).toEqual({ kind: 'none' })
    expect(() => clearSave(brokenStore, level.id)).not.toThrow()
  })
})
