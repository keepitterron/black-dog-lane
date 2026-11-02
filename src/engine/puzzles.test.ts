import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel, play } from '../../tests/fixture.ts'
import type { PuzzleInput } from './puzzles.ts'
import type { Effect, Level, Puzzle } from './schema.ts'
import { newGame } from './state.ts'

// Puts `puzzle` in close-up `cu` of chapter 1 and returns a state looking at it.
function setup(puzzle: Puzzle) {
  const level: Level = baseLevel()
  level.chapters[0].puzzles.push(puzzle)
  level.chapters[0].rooms[0]!.closeUps['cu'] = { layers: [], hotspots: [], puzzle: puzzle.id }
  const state = { ...newGame(level), location: { ...newGame(level).location, closeUps: ['cu'] } }
  const input = (...inputs: PuzzleInput[]) =>
    play(level, inputs.map(i => ({ type: 'puzzleInput', puzzle: puzzle.id, input: i }) as const), state)
  return { level, state, input }
}

const base: { id: string; clues: string[]; onSolve: Effect[] } = { id: 'p1', clues: [], onSolve: [{ do: 'setFlag', flag: 'won', value: true }] }

describe('puzzle widgets', () => {
  test('dial lock: rotates through symbols and wraps, solves on the right combination', () => {
    const { input } = setup({ ...base, kind: 'dialLock', symbols: ['moon', 'eye', 'key'], initial: ['moon', 'moon'], solution: ['key', 'eye'] })
    const wrapped = input({ kind: 'dial', dial: 0, dir: -1 }, { kind: 'dial', dial: 1, dir: 1 })
    expect(wrapped.state.flags).toMatchObject({ 'p1:dial0': 'key', 'p1:dial1': 'eye', 'p1:solved': true, won: true })
    expect(wrapped.events).toContainEqual({ type: 'puzzleSolved', puzzle: 'p1' })
  })

  test('clock: hours wrap at 12, minutes step and wrap at 60', () => {
    const { input } = setup({ ...base, kind: 'clockSet', initial: { h: 11, m: 45 }, solution: { h: 0, m: 0 }, minuteStep: 15 })
    const almost = input({ kind: 'clock', hand: 'h', dir: 1 })
    expect(almost.state.flags).toMatchObject({ 'p1:h': 0 })
    expect(almost.state.flags['won']).toBeUndefined()
    const { state } = input({ kind: 'clock', hand: 'h', dir: 1 }, { kind: 'clock', hand: 'm', dir: 1 })
    expect(state.flags).toMatchObject({ 'p1:m': 0, won: true })
  })

  test('sequence: a wrong tap starts over, solves on the full order', () => {
    const { input } = setup({ ...base, kind: 'sequence', targets: ['x', 'y', 'z'], solution: ['x', 'y', 'z'] })
    const tap = (target: string): PuzzleInput => ({ kind: 'tap', target })
    expect(input(tap('x'), tap('z')).state.flags['p1:progress']).toBe(0)
    expect(input(tap('x'), tap('x')).state.flags['p1:progress']).toBe(1)
    expect(input(tap('x'), tap('y'), tap('z')).state.flags['won']).toBe(true)
  })

  test('slider: only tiles next to the gap move; solves on the target layout', () => {
    // 1 2 / 0 3  →  1 2 / 3 0
    const { input } = setup({ ...base, kind: 'slider', size: 2, initial: [1, 2, 0, 3], solution: [1, 2, 3, 0] })
    expect(input({ kind: 'slide', tile: 1 }).state.flags['p1:tiles']).toBeUndefined()
    expect(input({ kind: 'slide', tile: 3 }).state.flags).toMatchObject({ 'p1:tiles': '1,2,3,0', won: true })
  })

  test('pattern: single toggles one cell, cross toggles neighbours too', () => {
    const single = setup({ ...base, kind: 'pattern', rows: 2, cols: 2, initial: '0000', solution: '1001', mode: 'single' })
    expect(single.input({ kind: 'toggle', cell: 0 }, { kind: 'toggle', cell: 3 }).state.flags).toMatchObject({ 'p1:cells': '1001', won: true })
    const cross = setup({ ...base, kind: 'pattern', rows: 3, cols: 3, initial: '000000000', solution: '010111010', mode: 'cross' })
    expect(cross.input({ kind: 'toggle', cell: 4 }).state.flags).toMatchObject({ 'p1:cells': '010111010', won: true })
    expect(cross.input({ kind: 'toggle', cell: 0 }).state.flags['p1:cells']).toBe('110100000')
  })

  test('trail: follow the marks in order across views; off-trail taps do nothing', () => {
    const { level } = setup({ ...base, kind: 'trail', trail: ['c1r/e', 'c1r/s', 'cu'] })
    const tap = (view: string) => ({ type: 'puzzleInput', puzzle: 'p1', input: { kind: 'trail', view } }) as const
    const right = { type: 'turn', dir: 'right' } as const
    expect(play(level, [right, right, tap('c1r/s')]).state.flags['p1:progress']).toBeUndefined()
    expect(play(level, [right, tap('c1r/e'), right, tap('c1r/s'), { type: 'open', view: 'cu' }, tap('cu')]).state.flags['won']).toBe(true)
    // A tap only counts on the view it names.
    expect(play(level, [tap('c1r/e')]).events).toContainEqual({ type: 'error', code: 'PUZZLE_NOT_IN_VIEW', ids: ['p1'] })
  })

  test('a solved puzzle ignores further input and onSolve runs once', () => {
    const { input } = setup({ ...base, kind: 'sequence', targets: ['x', 'y'], solution: ['x', 'y'], onSolve: [{ do: 'give', item: 'a' }] })
    const tap = (target: string): PuzzleInput => ({ kind: 'tap', target })
    const { events } = input(tap('x'), tap('y'), tap('x'), tap('y'))
    expect(events.filter(e => e.type === 'give')).toHaveLength(1)
  })

  test('input of the wrong kind, an unknown target, or a puzzle out of view is an error by id', () => {
    const { input, level } = setup({ ...base, kind: 'sequence', targets: ['x', 'y'], solution: ['x', 'y'] })
    expect(input({ kind: 'dial', dial: 0, dir: 1 }).events).toEqual([{ type: 'error', code: 'BAD_PUZZLE_INPUT', ids: ['p1'] }])
    expect(input({ kind: 'tap', target: 'nope' }).events).toEqual([{ type: 'error', code: 'BAD_PUZZLE_INPUT', ids: ['p1'] }])
    addHotspot(level, 'c1r/n', { id: 'h', rules: [] })
    const outOfView = play(level, [{ type: 'puzzleInput', puzzle: 'p1', input: { kind: 'tap', target: 'x' } }])
    expect(outOfView.events).toEqual([{ type: 'error', code: 'PUZZLE_NOT_IN_VIEW', ids: ['p1'] }])
  })
})

test('an inactive puzzle ignores input and explains why', () => {
  const { input, level, state } = setup({
    ...base,
    kind: 'clockSet',
    initial: { h: 3, m: 45 },
    solution: { h: 9, m: 15 },
    minuteStep: 5,
    activeWhen: { op: 'flag', flag: 'wound' },
    inactiveSay: 'Nothing turns.',
  })
  const idle = input({ kind: 'clock', hand: 'h', dir: 1 })
  expect(idle.said).toEqual(['Nothing turns.'])
  expect(idle.state.flags['p1:h']).toBeUndefined()
  const wound = play(level, [{ type: 'puzzleInput', puzzle: 'p1', input: { kind: 'clock', hand: 'h', dir: 1 } }], { ...state, flags: { wound: true } })
  expect(wound.state.flags['p1:h']).toBe(4)
})
