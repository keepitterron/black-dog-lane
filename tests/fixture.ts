// Builders for dull, non-secret test levels. Tests start from baseLevel() and add only what
// they exercise.
import { WALLS, type Chapter, type Hotspot, type Level, type Room, type View } from '../src/engine/schema.ts'
import { newGame, type GameState } from '../src/engine/state.ts'
import { step, type Action } from '../src/engine/step.ts'
import type { GameEvent } from '../src/engine/context.ts'

export const emptyView = (): View => ({ layers: [], hotspots: [] })

export const room = (id: string): Room => ({
  id,
  walls: { n: emptyView(), e: emptyView(), s: emptyView(), w: emptyView() },
  closeUps: {},
})

export const chapter = (id: string): Chapter => ({
  id,
  intro: `Intro ${id}.`,
  start: { room: `${id}r`, wall: 'n' },
  rooms: [room(`${id}r`)],
  puzzles: [],
  beats: [],
  objectives: [],
  exitWhen: { op: 'flag', flag: `${id}done` },
})

const item = (name: string) => ({ name, desc: `${name} description.`, icon: 'matchbox' })

export function baseLevel(): Level {
  return {
    id: 'fixture',
    schema: 1,
    title: 'Fixture',
    theme: 'test',
    palette: 'plain',
    items: { a: item('Item A'), b: item('Item B'), ab: item('Item AB'), key: item('Key') },
    combos: [{ a: 'a', b: 'b', make: 'ab', say: 'Combined.' }],
    chapters: [chapter('c1'), chapter('c2'), chapter('c3')],
    secrets: [],
    endings: [{ id: 'end', text: 'The end.' }],
  }
}

// Finds a view by id (`room/wall` or a close-up key) so tests can add to it.
export function viewOf(level: Level, id: string): View {
  const [roomId, part] = id.split('/')
  const wall = WALLS.find(w => w === part)
  for (const ch of level.chapters) {
    for (const r of ch.rooms) {
      if (wall && r.id === roomId) return r.walls[wall]
      const closeUp = r.closeUps[id]
      if (closeUp) return closeUp
    }
  }
  throw new Error(`no view ${id}`)
}

export function addHotspot(level: Level, viewId: string, hotspot: Omit<Hotspot, 'rect'>): void {
  viewOf(level, viewId).hotspots.push({ rect: [0, 0, 100, 100], ...hotspot })
}

// Runs actions from `state` (a new game by default), collecting every event.
export function play(level: Level, actions: Action[], state: GameState = newGame(level)) {
  const events: GameEvent[] = []
  for (const action of actions) {
    const result = step(level, state, action)
    state = result.state
    events.push(...result.events)
  }
  return { state, events, said: events.flatMap(e => (e.type === 'say' ? [e.text] : [])) }
}
