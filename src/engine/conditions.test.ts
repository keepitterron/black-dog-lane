import { describe, expect, test as it } from 'vitest'
import { baseLevel } from '../../tests/fixture.ts'
import { test } from './conditions.ts'
import { newGame, type GameState } from './state.ts'

const state = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(baseLevel()), ...patch })

describe('conditions', () => {
  it('a missing condition holds', () => {
    expect(test(undefined, state())).toBe(true)
  })

  it('flag: truthy without eq, exact match with eq', () => {
    const s = state({ flags: { lit: true, count: 2, word: 'moon', zero: 0 } })
    expect(test({ op: 'flag', flag: 'lit' }, s)).toBe(true)
    expect(test({ op: 'flag', flag: 'zero' }, s)).toBe(false)
    expect(test({ op: 'flag', flag: 'missing' }, s)).toBe(false)
    expect(test({ op: 'flag', flag: 'count', eq: 2 }, s)).toBe(true)
    expect(test({ op: 'flag', flag: 'count', eq: 3 }, s)).toBe(false)
    expect(test({ op: 'flag', flag: 'word', eq: 'moon' }, s)).toBe(true)
    expect(test({ op: 'flag', flag: 'lit', eq: false }, s)).toBe(false)
  })

  it('has: item in inventory', () => {
    expect(test({ op: 'has', item: 'a' }, state({ inventory: ['a'] }))).toBe(true)
    expect(test({ op: 'has', item: 'b' }, state({ inventory: ['a'] }))).toBe(false)
  })

  it('selected: item currently selected', () => {
    expect(test({ op: 'selected', item: 'a' }, state({ inventory: ['a'], selected: 'a' }))).toBe(true)
    expect(test({ op: 'selected', item: 'a' }, state({ inventory: ['a'] }))).toBe(false)
  })

  it('seen: view has been arrived at', () => {
    expect(test({ op: 'seen', view: 'c1r/e' }, state({ flags: { 'seen:c1r/e': true } }))).toBe(true)
    expect(test({ op: 'seen', view: 'c1r/e' }, state())).toBe(false)
  })

  it('fired: beat already ran', () => {
    expect(test({ op: 'fired', id: 'b1' }, state({ fired: ['b1'] }))).toBe(true)
    expect(test({ op: 'fired', id: 'b1' }, state())).toBe(false)
  })

  it('not, all, any', () => {
    const s = state({ flags: { x: true } })
    const yes = { op: 'flag', flag: 'x' } as const
    const no = { op: 'flag', flag: 'y' } as const
    expect(test({ op: 'not', cond: no }, s)).toBe(true)
    expect(test({ op: 'not', cond: yes }, s)).toBe(false)
    expect(test({ op: 'all', conds: [yes, yes] }, s)).toBe(true)
    expect(test({ op: 'all', conds: [yes, no] }, s)).toBe(false)
    expect(test({ op: 'all', conds: [] }, s)).toBe(true)
    expect(test({ op: 'any', conds: [no, yes] }, s)).toBe(true)
    expect(test({ op: 'any', conds: [no, no] }, s)).toBe(false)
    expect(test({ op: 'any', conds: [] }, s)).toBe(false)
  })
})
