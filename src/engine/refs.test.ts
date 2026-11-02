import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel } from '../../tests/fixture.ts'
import { checkRefs } from './refs.ts'
import type { Effect, Level } from './schema.ts'

function issues(tweak: (level: Level) => void) {
  const level = baseLevel()
  tweak(level)
  return checkRefs(level)
}
const withEffect = (effect: Effect) => (l: Level) => addHotspot(l, 'c1r/n', { id: 'h', rules: [{ do: [effect] }] })

describe('reference checks', () => {
  test('the base fixture is clean', () => {
    expect(checkRefs(baseLevel())).toEqual([])
  })

  test('duplicate and reserved ids', () => {
    expect(issues(l => addHotspot(l, 'c1r/n', { id: 'a', rules: [] }))).toEqual([{ code: 'DUPLICATE_ID', ids: ['a'] }])
    expect(issues(l => addHotspot(l, 'c1r/n', { id: 'dog', rules: [] }))).toEqual([{ code: 'RESERVED_ID', ids: ['dog'] }])
  })

  test('unknown items in effects, conditions, accepts and combos', () => {
    expect(issues(withEffect({ do: 'give', item: 'nope' }))).toEqual([{ code: 'UNKNOWN_ITEM', ids: ['nope'] }])
    expect(issues(l => addHotspot(l, 'c1r/n', { id: 'h', accepts: ['nope', 'dog'], rules: [{ when: { op: 'has', item: 'gone' }, do: [] }] }))).toEqual([
      { code: 'UNKNOWN_ITEM', ids: ['nope'] },
      { code: 'UNKNOWN_ITEM', ids: ['gone'] },
    ])
    expect(issues(l => l.combos.push({ a: 'a', b: 'x', make: 'ab', say: 'Hm.' }))).toEqual([{ code: 'UNKNOWN_ITEM', ids: ['x'] }])
  })

  test('unknown views, rooms, beats and puzzles', () => {
    expect(issues(withEffect({ do: 'open', view: 'nope' }))).toEqual([{ code: 'UNKNOWN_VIEW', ids: ['nope'] }])
    expect(issues(withEffect({ do: 'goto', room: 'c2r' }))).toEqual([{ code: 'UNKNOWN_ROOM', ids: ['c2r'] }])
    expect(issues(withEffect({ do: 'beat', id: 'nope' }))).toEqual([{ code: 'UNKNOWN_BEAT', ids: ['nope'] }])
    expect(issues(l => (l.chapters[0].rooms[0]!.walls.e.puzzle = 'nope'))).toEqual([{ code: 'UNKNOWN_PUZZLE', ids: ['nope'] }])
    expect(issues(l => (l.chapters[1].start.room = 'c1r'))).toEqual([{ code: 'UNKNOWN_ROOM', ids: ['c1r'] }])
  })

  test('dog moments must target a hotspot or item; fired must name a beat or dog moment', () => {
    expect(issues(l => l.chapters[0].dogMoments.push({ id: 'm', role: 'fetch', at: 'nowhere', do: [] }))).toEqual([
      { code: 'UNKNOWN_TARGET', ids: ['m', 'nowhere'] },
    ])
    expect(issues(l => (l.chapters[0].exitWhen = { op: 'fired', id: 'ghost' }))).toEqual([{ code: 'UNKNOWN_FIRED', ids: ['ghost'] }])
  })

  test('a secret tell must name a layer in its view', () => {
    expect(issues(l => l.secrets.push({ id: 's', foundWhen: { op: 'flag', flag: 'f' }, tell: { view: 'c1r/n', layer: 'missing' } }))).toEqual([
      { code: 'UNKNOWN_LAYER', ids: ['s', 'missing'] },
    ])
  })

  test('puzzle data must be consistent', () => {
    const p = { id: 'p', clues: [], onSolve: [] }
    const shapes: Level['chapters'][0]['puzzles'] = [
      { ...p, kind: 'dialLock', symbols: ['x', 'y'], initial: ['x'], solution: ['x', 'y'] },
      { ...p, kind: 'clockSet', initial: { h: 1, m: 0 }, solution: { h: 2, m: 10 }, minuteStep: 15 },
      { ...p, kind: 'sequence', targets: ['x', 'y'], solution: ['x', 'z'] },
      { ...p, kind: 'slider', size: 2, initial: [0, 1, 2, 2], solution: [1, 2, 3, 0] },
      { ...p, kind: 'pattern', rows: 2, cols: 2, initial: '000', solution: '1111', mode: 'single' },
    ]
    for (const puzzle of shapes) expect(issues(l => l.chapters[0].puzzles.push(puzzle))).toEqual([{ code: 'PUZZLE_SHAPE', ids: ['p'] }])
  })
})
