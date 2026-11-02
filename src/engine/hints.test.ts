import { expect, test } from 'vitest'
import { baseLevel, play } from '../../tests/fixture.ts'
import { DOG } from './dog.ts'
import { newGame } from './state.ts'

function level() {
  const l = baseLevel()
  l.chapters[0].objectives.push(
    { id: 'o1', doneWhen: { op: 'flag', flag: 'one' }, hints: ['Look {dog}.', 'Paw.', 'Answer.'], dogPoints: 'c1r/e' },
    { id: 'o2', availableWhen: { op: 'flag', flag: 'one' }, doneWhen: { op: 'flag', flag: 'two' }, hints: ['A.', 'B.', 'C.'], dogPoints: 'c1r/s' },
  )
  return l
}
const ask = { type: 'askDog' } as const

test('asking the dog escalates trot → paw → answer, then stays on the answer', () => {
  const { events } = play(level(), [ask, ask, ask, ask])
  expect(events).toEqual([
    { type: 'hint', objective: 'o1', tier: 0, view: 'c1r/e', act: 'trot', text: `Look ${DOG.name}.` },
    { type: 'hint', objective: 'o1', tier: 1, view: 'c1r/e', act: 'paw', text: 'Paw.' },
    { type: 'hint', objective: 'o1', tier: 2, view: 'c1r/e', act: null, text: 'Answer.' },
    { type: 'hint', objective: 'o1', tier: 2, view: 'c1r/e', act: null, text: 'Answer.' },
  ])
})

test('the next objective starts again at the first tier', () => {
  const asked = play(level(), [ask, ask]).state
  const { events } = play(level(), [ask], { ...asked, flags: { one: true } })
  expect(events).toEqual([{ type: 'hint', objective: 'o2', tier: 0, view: 'c1r/s', act: 'trot', text: 'A.' }])
})

test('with nothing left to do the dog says so', () => {
  const { events, state } = play(level(), [ask], { ...newGame(level()), flags: { one: true, two: true } })
  expect(events).toEqual([{ type: 'say', text: `${DOG.name} yawns. Nothing to sniff out right now.` }])
  expect(state.hint).toEqual({ objective: null, tier: 0 })
})
