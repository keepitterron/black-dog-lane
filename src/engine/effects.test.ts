import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel, play } from '../../tests/fixture.ts'
import { DOG } from './dog.ts'
import type { Effect, Level } from './schema.ts'
import { newGame } from './state.ts'

// A level whose c1 north wall has one hotspot `h` running `effects`.
function withEffects(effects: Effect[], tweak?: (level: Level) => void): Level {
  const level = baseLevel()
  addHotspot(level, 'c1r/n', { id: 'h', rules: [{ do: effects }] })
  tweak?.(level)
  return level
}

const tap = { type: 'tapHotspot', id: 'h' } as const

describe('effects', () => {
  test('say emits the text with the dog name filled in', () => {
    const { said } = play(withEffects([{ do: 'say', text: 'Hello {dog}.' }]), [tap])
    expect(said).toEqual([`Hello ${DOG.name}.`])
  })

  test('give adds an item once', () => {
    const { state, events } = play(withEffects([{ do: 'give', item: 'a' }]), [tap, tap])
    expect(state.inventory).toEqual(['a'])
    expect(events).toContainEqual({ type: 'give', item: 'a' })
  })

  test('take removes an item and clears it if selected', () => {
    const level = baseLevel()
    addHotspot(level, 'c1r/n', { id: 'h', accepts: ['a'], rules: [{ do: [{ do: 'take', item: 'a' }] }] })
    const start = { ...newGame(level), inventory: ['a', 'b'], selected: 'a' }
    const { state, events } = play(level, [tap], start)
    expect(state.inventory).toEqual(['b'])
    expect(state.selected).toBeNull()
    expect(events).toContainEqual({ type: 'take', item: 'a' })
  })

  test('setFlag sets boolean, number and string flags', () => {
    const { state } = play(
      withEffects([
        { do: 'setFlag', flag: 'lit', value: true },
        { do: 'setFlag', flag: 'n', value: 3 },
        { do: 'setFlag', flag: 's', value: 'moon' },
      ]),
      [tap],
    )
    expect(state.flags).toMatchObject({ lit: true, n: 3, s: 'moon' })
  })

  test('open pushes a close-up of the current room', () => {
    const level = withEffects([{ do: 'open', view: 'cu' }], l => {
      if (l.chapters[0].rooms[0]) l.chapters[0].rooms[0].closeUps['cu'] = { layers: [], hotspots: [] }
    })
    expect(play(level, [tap]).state.location.closeUps).toEqual(['cu'])
  })

  test('open reports an unknown or out-of-room view by id', () => {
    const { state, events } = play(withEffects([{ do: 'open', view: 'nowhere' }]), [tap])
    expect(state.location.closeUps).toEqual([])
    expect(events).toContainEqual({ type: 'error', code: 'UNKNOWN_VIEW', ids: ['nowhere'] })
  })

  test('goto moves to another room in the chapter, north wall by default', () => {
    const level = withEffects([{ do: 'goto', room: 'other' }], l => {
      l.chapters[0].rooms.push({ ...structuredClone(l.chapters[0].rooms[0]!), id: 'other', closeUps: {} })
    })
    const { location } = play(level, [tap]).state
    expect(location).toMatchObject({ room: 'other', wall: 'n', closeUps: [] })
    const toEast = withEffects([{ do: 'goto', room: 'other', wall: 'e' }], l => {
      l.chapters[0].rooms.push({ ...structuredClone(l.chapters[0].rooms[0]!), id: 'other', closeUps: {} })
    })
    expect(play(toEast, [tap]).state.location.wall).toBe('e')
  })

  test('goto refuses a room from another chapter', () => {
    const { state, events } = play(withEffects([{ do: 'goto', room: 'c2r' }]), [tap])
    expect(state.location.room).toBe('c1r')
    expect(events).toContainEqual({ type: 'error', code: 'UNKNOWN_ROOM', ids: ['c2r'] })
  })

  test('sound emits a sound event', () => {
    expect(play(withEffects([{ do: 'sound', sfx: 'knock' }]), [tap]).events).toContainEqual({ type: 'sound', sfx: 'knock' })
  })

  test('beat fires a beat once, with its dog response', () => {
    const level = withEffects([{ do: 'beat', id: 'b1' }], l => {
      l.chapters[0].beats.push({
        id: 'b1',
        on: { type: 'arrive', view: 'c1r/s' },
        once: true,
        threat: true,
        do: [{ do: 'say', text: 'Beat.' }],
        dogResponse: 'standGuard',
      })
    })
    const { state, events } = play(level, [tap, tap])
    expect(state.fired).toEqual(['b1'])
    expect(events).toEqual([
      { type: 'beat', id: 'b1' },
      { type: 'say', text: 'Beat.' },
      { type: 'dog', act: 'standGuard' },
    ])
  })

  test('endChapter moves to the next chapter when its exit holds', () => {
    const level = withEffects([{ do: 'setFlag', flag: 'c1done', value: true }, { do: 'endChapter' }])
    const start = { ...newGame(level), inventory: ['a'], flags: { kept: true } }
    const { state, events } = play(level, [tap], start)
    expect(events).toContainEqual({ type: 'chapterEnd', chapter: 'c1' })
    expect(state.location).toEqual({ chapter: 'c2', room: 'c2r', wall: 'n', closeUps: [] })
    // Inventory and flags carry over between chapters.
    expect(state.inventory).toEqual(['a'])
    expect(state.flags).toMatchObject({ kept: true })
  })

  test('endChapter is refused while the exit condition is false', () => {
    const { state, events } = play(withEffects([{ do: 'endChapter' }]), [tap])
    expect(state.location.chapter).toBe('c1')
    expect(events).toContainEqual({ type: 'error', code: 'EXIT_NOT_MET', ids: ['c1'] })
  })

  test('endChapter in the last chapter picks the first matching ending and counts secrets', () => {
    const level = baseLevel()
    level.endings = [
      { id: 'best', when: { op: 'flag', flag: 'never' }, text: 'Best.' },
      { id: 'good', when: { op: 'flag', flag: 'c3done' }, text: '{dog} did it.' },
      { id: 'plain', text: 'Plain.' },
    ]
    level.secrets = [
      { id: 's1', foundWhen: { op: 'flag', flag: 'found1' }, tell: { view: 'c3r/n', layer: 'l1' } },
      { id: 's2', foundWhen: { op: 'flag', flag: 'found2' }, tell: { view: 'c3r/n', layer: 'l1' } },
    ]
    addHotspot(level, 'c3r/n', { id: 'h', rules: [{ do: [{ do: 'setFlag', flag: 'c3done', value: true }, { do: 'endChapter' }, { do: 'say', text: 'After.' }] }] })
    const start = { ...newGame(level), location: { chapter: 'c3', room: 'c3r', wall: 'n' as const, closeUps: [] }, flags: { found1: true } }
    const { state, events, said } = play(level, [tap, tap], start)
    expect(state.ended).toBe('good')
    expect(events).toContainEqual({ type: 'ending', id: 'good', text: `${DOG.name} did it.`, secretsFound: 1, secretsTotal: 2 })
    // Nothing runs after the ending, and later actions are ignored.
    expect(said).toEqual([])
  })

  test('dog plays a dog act', () => {
    expect(play(withEffects([{ do: 'dog', act: 'wag' }]), [tap]).events).toContainEqual({ type: 'dog', act: 'wag' })
  })
})
