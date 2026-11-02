// Plays the basic test level from start to ending through the public engine API.
import { expect, test } from 'vitest'
import { parseLevel } from '../src/engine/schema.ts'
import type { Action } from '../src/engine/step.ts'
import basic from '../levels/test/basic.json'
import { play } from './fixture.ts'

const parsed = parseLevel(basic)
if (!parsed.ok) throw new Error('levels/test/basic.json is invalid')
const level = parsed.level

test('the basic level plays through all three chapters to the hero ending', () => {
  const actions: Action[] = [
    { type: 'arrive' },
    { type: 'askDog' },
    { type: 'turn', dir: 'right' },
    { type: 'arrive' },
    { type: 'tapHotspot', id: 'shelf' },
    { type: 'turn', dir: 'left' },
    { type: 'tapHotspot', id: 'door1' },
    { type: 'tapItem', id: 'key' },
    { type: 'tapHotspot', id: 'door1' },
    { type: 'tapHotspot', id: 'door1' },
    { type: 'tapHotspot', id: 'door2' },
    { type: 'tapHotspot', id: 'lockbox' },
    { type: 'puzzleInput', puzzle: 'p1', input: { kind: 'dial', dial: 0, dir: 1 } },
    { type: 'tapItem', id: 'dog' },
    { type: 'tapHotspot', id: 'hole' },
  ]
  const { state, events } = play(level, actions)
  expect(events.filter(e => e.type === 'error')).toEqual([])
  expect(events.filter(e => e.type === 'chapterEnd')).toEqual([
    { type: 'chapterEnd', chapter: 'c1' },
    { type: 'chapterEnd', chapter: 'c2' },
    { type: 'chapterEnd', chapter: 'c3' },
  ])
  expect(events).toContainEqual({ type: 'beat', id: 'b1' })
  expect(events).toContainEqual({ type: 'dog', act: 'standGuard' })
  expect(events.find(e => e.type === 'ending')).toMatchObject({ id: 'hero', secretsFound: 0, secretsTotal: 1 })
  expect(state.ended).toBe('hero')
})
