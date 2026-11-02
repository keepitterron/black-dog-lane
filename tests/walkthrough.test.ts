// Plays the basic test level from start to ending through the public engine API.
import { expect, test } from 'vitest'
import { parseLevel } from '../src/engine/schema.ts'
import type { Action } from '../src/engine/step.ts'
import basic from '../levels/test/basic.json'
import twoRoomsJson from '../levels/test/two-rooms.json'
import { play } from './fixture.ts'

const parsed = parseLevel(basic)
if (!parsed.ok) throw new Error('levels/test/basic.json is invalid')
const level = parsed.level

test('the basic level plays through all three chapters to the ending', () => {
  const actions: Action[] = [
    { type: 'arrive' },
    { type: 'hint' },
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
  expect(events.find(e => e.type === 'ending')).toMatchObject({ id: 'found', secretsFound: 0, secretsTotal: 1 })
  expect(state.ended).toBe('found')
})

const twoRoomsParsed = parseLevel(twoRoomsJson)
if (!twoRoomsParsed.ok) throw new Error('levels/test/two-rooms.json is invalid')
const twoRooms = twoRoomsParsed.level

// One chapter of two-rooms: thread A in the first room, through the door, thread B in the
// second room, back through the door, then the lock by the exit.
function twoRoomsChapter(ch: string, solution: [string, string], { needs, secret }: { needs?: string; secret?: boolean }): Action[] {
  const tap = (id: string): Action => ({ type: 'tapHotspot', id })
  const turn = (dir: 'left' | 'right'): Action => ({ type: 'turn', dir })
  const symbols = ['moon', 'eye', 'key', 'bird', 'sun', 'star']
  const dial = (i: number) => Array.from({ length: symbols.indexOf(solution[i] ?? 'moon') }, (): Action => ({ type: 'puzzleInput', puzzle: `${ch}dial`, input: { kind: 'dial', dial: i, dir: 1 } }))
  return [
    turn('right'),
    ...(needs ? [{ type: 'tapItem', id: needs } as const] : []),
    tap(`${ch}a1`), tap(`${ch}a2`), tap(`${ch}a3`),
    tap(`${ch}note`), { type: 'arrive' }, { type: 'back' },
    turn('right'),
    tap(`${ch}a4`), tap(`${ch}a5`), tap(`${ch}a6`),
    turn('right'),
    tap(`${ch}toB`),
    turn('left'),
    tap(`${ch}b1`), tap(`${ch}b2`), tap(`${ch}b3`),
    tap(`${ch}sign`), { type: 'arrive' }, { type: 'back' },
    turn('left'), turn('left'),
    tap(`${ch}b4`), tap(`${ch}b5`), tap(`${ch}b6`),
    ...(secret ? [tap(`${ch}odd`)] : []),
    turn('left'),
    tap(`${ch}toA`),
    turn('right'),
    tap(`${ch}exit`), ...dial(0), ...dial(1), { type: 'back' },
    tap(`${ch}exit`),
  ]
}

test('two-rooms plays through doors, carrying keys from one chapter to the next', () => {
  const c1 = play(twoRooms, twoRoomsChapter('c1', ['eye', 'key'], { secret: true }))
  expect(c1.events.filter(e => e.type === 'error')).toEqual([])
  expect(c1.state.location).toMatchObject({ chapter: 'c2', room: 'c2ra' })
  expect(c1.state.inventory).toEqual(['ironKey'])

  const c2 = play(twoRooms, twoRoomsChapter('c2', ['sun', 'bird'], { needs: 'ironKey' }), c1.state)
  expect(c2.events.filter(e => e.type === 'error')).toEqual([])
  expect(c2.state.inventory).toEqual(['brassKey'])

  const c3 = play(twoRooms, twoRoomsChapter('c3', ['star', 'eye'], { needs: 'brassKey' }), c2.state)
  expect(c3.events.filter(e => e.type === 'error')).toEqual([])
  expect(c3.state.inventory).toEqual([])
  expect(c3.state.ended).toBe('endFound')
})
