import { expect, test } from 'vitest'
import { baseLevel, play } from '../../tests/fixture.ts'
import { currentObjective, revealedHints } from './hints.ts'
import { newGame } from './state.ts'

function level() {
  const l = baseLevel()
  l.chapters[0].objectives.push(
    { id: 'o1', doneWhen: { op: 'flag', flag: 'one' }, hints: ['Look.', 'Closer.', 'Answer.'] },
    { id: 'o2', availableWhen: { op: 'flag', flag: 'one' }, doneWhen: { op: 'flag', flag: 'two' }, hints: ['A.', 'B.', 'C.'] },
  )
  return l
}
const hint = { type: 'hint' } as const

test('asking for a hint escalates through three tiers, then stays on the answer', () => {
  const { events } = play(level(), [hint, hint, hint, hint])
  expect(events).toEqual([
    { type: 'hint', objective: 'o1', tier: 0, text: 'Look.' },
    { type: 'hint', objective: 'o1', tier: 1, text: 'Closer.' },
    { type: 'hint', objective: 'o1', tier: 2, text: 'Answer.' },
    { type: 'hint', objective: 'o1', tier: 2, text: 'Answer.' },
  ])
})

test('the next objective starts again at the first tier', () => {
  const asked = play(level(), [hint, hint]).state
  const { events } = play(level(), [hint], { ...asked, flags: { one: true } })
  expect(events).toEqual([{ type: 'hint', objective: 'o2', tier: 0, text: 'A.' }])
})

test('with nothing left to do the hint says so', () => {
  const { events, state } = play(level(), [hint], { ...newGame(level()), flags: { one: true, two: true } })
  expect(events).toEqual([{ type: 'say', text: 'There’s nothing more to find right now.' }])
  expect(state.hint).toEqual({ objective: null, tier: 0 })
})

test('revealed hints are the tiers asked so far for the current objective', () => {
  const l = level()
  expect(currentObjective(l, newGame(l))?.id).toBe('o1')
  expect(revealedHints(l, newGame(l))).toEqual([])
  expect(revealedHints(l, play(l, [hint]).state)).toEqual(['Look.'])
  expect(revealedHints(l, play(l, [hint, hint, hint, hint]).state)).toEqual(['Look.', 'Closer.', 'Answer.'])
  // Once that objective is done, the next one has nothing revealed yet.
  const moved = { ...play(l, [hint, hint]).state, flags: { one: true } }
  expect(currentObjective(l, moved)?.id).toBe('o2')
  expect(revealedHints(l, moved)).toEqual([])
  expect(currentObjective(l, { ...moved, flags: { one: true, two: true } })).toBeNull()
})
