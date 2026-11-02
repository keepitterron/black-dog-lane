// Builds levels/test/two-rooms.json: a dull, non-secret level with doors between rooms that
// passes the validator's strict `play` profile. Run `npm run fixtures` after editing.
//
// Every chapter has two rooms joined by a door that is always open. Thread A runs in the first
// room and thread B in the second, the dial lock by the exit needs both threads and a clue
// close-up from each room, and a key found at the end of one chapter opens the first step of
// the next, so the inventory has to carry over. Every tap target is drawn as a frame. The level
// brings two drawings of its own: a piece of decor on each west wall and the brass key's icon.
import type { Chapter, Hotspot, Level, Room, View } from '../../src/engine/schema.ts'
import { ALL, F, hints, NOT, say, set, slot, thread, TOP_LEFT } from './strict.ts'

type Layer = View['layers'][number]
type Rect = Hotspot['rect']

const DOOR: Rect = [330, 150, 140, 300]
const frameAt = ([x, y, w, h]: Rect, extra: Partial<Layer> = {}, symbol?: string): Layer => ({
  asset: 'frame',
  params: { x, y, w, h, ...(symbol ? { symbol } : {}) },
  ...extra,
})

// A wall: the room shell and a frame under every hotspot that shows and hides with it.
const wall = (hotspots: Hotspot[]): View => ({
  layers: [{ asset: 'roomShell' }, ...hotspots.map(h => frameAt(h.rect, h.visibleWhen ? { visibleWhen: h.visibleWhen } : {}))],
  hotspots,
})
const clue = (id: string, symbol: string): View => ({
  layers: [{ asset: 'roomShell' }, frameAt([250, 130, 300, 300], {}, symbol)],
  hotspots: [{ id: `${id}Text`, rect: [250, 130, 300, 300], looksLikeClue: true, rules: [{ do: [say(`Clue ${id}.`)] }] }],
})
const opener = (id: string, target: string): Hotspot => ({ id, rect: slot(TOP_LEFT), rules: [{ do: [{ do: 'open', view: target }] }] })

type Keys = { needs?: string; gives?: string; secret?: boolean }

function chapter(ch: string, solution: [string, string], { needs, gives, secret }: Keys): Chapter {
  const a = thread(ch, 'a', 6)
  const b = thread(ch, 'b', 6)
  const [ra, rb] = [`${ch}ra`, `${ch}rb`]
  const done = `${ch}done`
  const left = `${ch}left`

  // The first step of thread A takes the key carried over from the last chapter.
  const first = a.spots[0]
  if (needs && first) {
    first.accepts = [needs]
    first.rules = [
      { when: { op: 'selected', item: needs }, do: [{ do: 'take', item: needs }, set(first.id), say(`Step ${first.id}.`)] },
      { do: [say('It needs something.')] },
    ]
  }
  // The last step of thread B hands over the key for the next chapter.
  const last = b.spots.at(-1)
  if (gives && last) last.rules[0]?.do.push({ do: 'give', item: gives })

  const roomA: Room = {
    id: ra,
    walls: {
      n: {
        layers: [{ asset: 'roomShell' }, { asset: 'door', params: { openFlag: done } }],
        hotspots: [{ id: `${ch}exit`, rect: DOOR, rules: [{ when: F(done), do: [set(left), { do: 'endChapter' }] }, { do: [{ do: 'open', view: `${ch}lockC` }] }] }],
      },
      e: wall([opener(`${ch}note`, `${ch}noteC`), ...a.spots.slice(0, 3)]),
      s: wall(a.spots.slice(3)),
      w: { layers: [{ asset: 'roomShell' }, { asset: 'doorway' }, { asset: 'a01', params: { atX: 130, atY: 300 } }], hotspots: [{ id: `${ch}toB`, rect: DOOR, rules: [{ do: [{ do: 'goto', room: rb, wall: 'e' }] }] }] },
    },
    closeUps: {
      [`${ch}lockC`]: { layers: [{ asset: 'lockPlateClose' }], hotspots: [], puzzle: `${ch}dial` },
      [`${ch}noteC`]: clue(`${ch}note`, solution[0]),
    },
  }

  const roomB: Room = {
    id: rb,
    walls: {
      n: wall([opener(`${ch}sign`, `${ch}signC`), ...b.spots.slice(0, 3)]),
      e: { layers: [{ asset: 'roomShell' }, { asset: 'doorway' }], hotspots: [{ id: `${ch}toA`, rect: DOOR, rules: [{ do: [{ do: 'goto', room: ra, wall: 'w' }] }] }] },
      s: wall(b.spots.slice(3)),
      w: { layers: [{ asset: 'roomShell' }, { asset: 'rug' }, { asset: 'a01', params: { slot: 'right' } }], hotspots: [] },
    },
    closeUps: { [`${ch}signC`]: clue(`${ch}sign`, solution[1]) },
  }

  // One secret: an odd frame in the second room of chapter 1 that goes away once tapped.
  if (secret) {
    const found = `${ch}found`
    roomB.walls.s.layers.push(frameAt(slot(TOP_LEFT), { id: `${ch}mark`, visibleWhen: NOT(F(found)) }, 'star'))
    roomB.walls.s.hotspots.push({ id: `${ch}odd`, rect: slot(TOP_LEFT), visibleWhen: NOT(F(found)), rules: [{ do: [set(found), say('Found it.')] }] })
  }

  return {
    id: ch,
    intro: `Chapter ${ch}.`,
    outro: `End of ${ch}.`,
    start: { room: ra, wall: 'n' },
    rooms: [roomA, roomB],
    puzzles: [
      {
        id: `${ch}dial`,
        kind: 'dialLock',
        clues: [`${ch}noteC`, `${ch}signC`],
        activeWhen: ALL(F(a.done), F(b.done)),
        inactiveSay: 'Not yet.',
        symbols: ['moon', 'eye', 'key', 'bird', 'sun', 'star'],
        initial: ['moon', 'moon'],
        solution,
        onSolve: [set(done), { do: 'sound', sfx: 'unlock' }],
      },
    ],
    beats: [...a.beats, ...b.beats],
    objectives: [
      { id: `${ch}oA`, doneWhen: F(a.done), hints: hints(`${ch}oA`) },
      { id: `${ch}oB`, doneWhen: F(b.done), hints: hints(`${ch}oB`) },
      { id: `${ch}oLock`, doneWhen: F(done), hints: hints(`${ch}oLock`) },
      { id: `${ch}oOut`, availableWhen: F(done), doneWhen: F(left), hints: hints(`${ch}oOut`) },
    ],
    exitWhen: F(done),
  }
}

export function twoRooms(): Level {
  const chapters: Level['chapters'] = [
    chapter('c1', ['eye', 'key'], { gives: 'ironKey', secret: true }),
    chapter('c2', ['sun', 'bird'], { needs: 'ironKey', gives: 'brassKey' }),
    chapter('c3', ['star', 'eye'], { needs: 'brassKey' }),
  ]
  // The ending is the last chapter's payoff.
  delete chapters[2].outro
  const items: Level['items'] = {
    ironKey: { name: 'Iron key', desc: 'A key from chapter one.', icon: 'ironKey' },
    brassKey: { name: 'Brass key', desc: 'A key from chapter two.', icon: 'a02' },
  }
  return {
    id: 'two-rooms',
    schema: 2,
    title: 'Two Rooms',
    theme: 'test fixture with doors between rooms',
    palette: 'plain',
    art: {
      // A tall dark panel with a faint ring, swaying a little.
      a01: {
        kind: 'wall',
        bbox: [0, 0, 80, 160],
        anchor: 'wall',
        decor: true,
        shapes: [
          { el: 'rect', x: 0, y: 0, w: 80, h: 160, r: 6, fill: 'woodDark', stroke: 'woodEdge', width: 4 },
          { el: 'circle', cx: 40, cy: 60, r: 18, fill: 'none', stroke: 'wallMotif', width: 3, anim: 'breathe' },
        ],
      },
      // A plain key drawn in the 60×60 prop box.
      a02: {
        kind: 'prop',
        shapes: [
          { el: 'circle', cx: -14, cy: 0, r: 9, fill: 'none', stroke: 'brass', width: 5 },
          { el: 'path', d: 'M-5 0 H22 M14 0 V8 M20 0 V6', stroke: 'brass', width: 5 },
        ],
      },
    },
    items,
    combos: [],
    chapters,
    secrets: [{ id: 'sMark', foundWhen: F('c1found'), tell: { view: 'c1rb/s', layer: 'c1mark' } }],
    endings: [
      { id: 'endFound', when: F('c1found'), text: 'The end, with the secret.' },
      { id: 'end', text: 'The end.' },
    ],
  }
}
