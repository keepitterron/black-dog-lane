// Builds levels/test/strict.json: a dull, non-secret level that passes the validator's strict
// `play` profile, proving the profile can be met. It is also the base for the broken fixtures
// (scripts/levels/broken.ts), each of which breaks exactly one rule. Run `npm run fixtures`
// after editing.
//
// Every chapter is one room with two parallel threads of taps (A on the north and east walls,
// B on the south and west walls), a dial lock behind the door that needs both threads and two
// clue close-ups, and a door that leaves once the lock is open. The south wall shows a piece of
// the level's own decor, clear of every hotspot.
import type { Beat, Chapter, Cond, Effect, Hotspot, Level, Objective, Room, View } from '../../src/engine/schema.ts'

export const F = (flag: string): Cond => ({ op: 'flag', flag })
export const NOT = (cond: Cond): Cond => ({ op: 'not', cond })
export const ALL = (...conds: Cond[]): Cond => ({ op: 'all', conds })
export const set = (flag: string): Effect => ({ do: 'setFlag', flag, value: true })
export const say = (text: string): Effect => ({ do: 'say', text })
export const hints = (id: string): Objective['hints'] => [`Hint ${id} a.`, `Hint ${id} b.`, `Hint ${id} c.`]

// Six non-overlapping tap slots per view (two rows of three), padded size included.
const SLOTS: Hotspot['rect'][] = [60, 330, 600].flatMap(x => [60, 360].map(y => [x, y, 140, 140] as Hotspot['rect']))
export const slot = (i: number): Hotspot['rect'] => SLOTS[i % SLOTS.length] ?? [0, 0, 140, 140]
export const TOP_LEFT = 0
const TOP_MIDDLE = 2
const BOTTOM = [1, 3, 5]

const view = (hotspots: Hotspot[], extra: Partial<View> = {}): View => ({ layers: [{ asset: 'roomShell' }], hotspots, ...extra })

export type StrictOptions = { steps?: number }

// A thread is a chain of taps; each hotspot shows once the previous one is done and goes away
// once tapped. A beat follows every second tap and the last one.
export function thread(ch: string, name: 'a' | 'b', steps: number) {
  const flag = (i: number) => `${ch}${name}${i}`
  const spots = Array.from({ length: steps }, (_, k): Hotspot => {
    const i = k + 1
    return {
      id: flag(i),
      rect: slot(BOTTOM[k % BOTTOM.length] ?? 1),
      visibleWhen: i === 1 ? NOT(F(flag(1))) : ALL(F(flag(i - 1)), NOT(F(flag(i)))),
      rules: [{ do: [set(flag(i)), say(`Step ${name}${i}.`)] }],
    }
  })
  const beats = spots.flatMap((spot, k): Beat[] =>
    (k + 1) % 2 === 0 || k + 1 === steps
      ? [{ id: `${spot.id}Beat`, on: { type: 'afterFlag', flag: spot.id }, once: true, do: [{ do: 'sound', sfx: 'sting' }, say(`Beat ${spot.id}.`)] }]
      : [],
  )
  return { spots, beats, done: flag(steps) }
}

export function strictChapter(ch: string, { steps = 6 }: StrictOptions = {}): Chapter {
  const a = thread(ch, 'a', steps)
  const b = thread(ch, 'b', steps)
  const [aWall1, aWall2] = [a.spots.slice(0, 3), a.spots.slice(3)]
  const [bWall1, bWall2] = [b.spots.slice(0, 3), b.spots.slice(3)]
  const r = `${ch}r`
  const done = `${ch}done`
  const left = `${ch}left`
  const clue = (id: string): View => view([{ id: `${id}Text`, rect: [100, 100, 600, 400], looksLikeClue: true, rules: [{ do: [say(`Clue ${id}.`)] }] }])
  const opener = (id: string, target: string): Hotspot => ({ id, rect: slot(TOP_MIDDLE), rules: [{ do: [{ do: 'open', view: target }] }] })

  const room: Room = {
    id: r,
    walls: {
      n: view([
        { id: `${ch}door`, rect: slot(TOP_MIDDLE), rules: [{ when: F(done), do: [set(left), { do: 'endChapter' }] }, { do: [{ do: 'open', view: `${ch}lockC` }] }] },
        ...aWall1,
      ]),
      e: view([opener(`${ch}note`, `${ch}noteC`), ...aWall2]),
      s: { ...view(bWall1), layers: [{ asset: 'roomShell' }, { asset: 'a01', params: { atX: 265, atY: 280 } }] },
      w: view([opener(`${ch}sign`, `${ch}signC`), ...bWall2]),
    },
    closeUps: {
      [`${ch}lockC`]: view([], { puzzle: `${ch}dial` }),
      [`${ch}noteC`]: clue(`${ch}note`),
      [`${ch}signC`]: clue(`${ch}sign`),
    },
  }

  return {
    id: ch,
    intro: `Chapter ${ch}.`,
    outro: `End of ${ch}.`,
    start: { room: r, wall: 'n' },
    rooms: [room],
    puzzles: [
      {
        id: `${ch}dial`,
        kind: 'dialLock',
        clues: [`${ch}noteC`, `${ch}signC`],
        activeWhen: ALL(F(a.done), F(b.done)),
        inactiveSay: 'Not yet.',
        symbols: ['moon', 'eye', 'key', 'bird'],
        initial: ['moon', 'moon'],
        solution: ['eye', 'key'],
        onSolve: [set(done), { do: 'sound', sfx: 'click' }],
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

export function strict(): Level {
  const chapters: Level['chapters'] = [strictChapter('c1'), strictChapter('c2'), strictChapter('c3')]
  // The ending is the last chapter's payoff.
  delete chapters[2].outro
  // One secret: an odd mark on the south wall of chapter 1 that goes away once tapped.
  const south = chapters[0].rooms[0]?.walls.s
  south?.layers.push({ id: 'c1mark', asset: 'roomShell', visibleWhen: NOT(F('c1found')) })
  south?.hotspots.push({ id: 'c1odd', rect: slot(TOP_LEFT), visibleWhen: NOT(F('c1found')), rules: [{ do: [set('c1found'), say('Found it.')] }] })
  return {
    id: 'strict',
    schema: 2,
    title: 'Strict Test Level',
    theme: 'test fixture that passes the strict profile',
    palette: { base: 'plain', colours: { wall: '#5c5850' } },
    art: {
      a01: {
        kind: 'wall',
        bbox: [0, 0, 60, 80],
        anchor: 'wall',
        decor: true,
        shapes: [
          { el: 'rect', x: 0, y: 0, w: 60, h: 80, fill: 'woodDark' },
          { el: 'circle', cx: 30, cy: 40, r: 14, fill: 'wallMotif', unless: 'c1found' },
        ],
      },
    },
    items: {},
    combos: [],
    chapters,
    secrets: [{ id: 'sMark', foundWhen: F('c1found'), tell: { view: 'c1r/s', layer: 'c1mark' } }],
    endings: [
      { id: 'endFound', when: F('c1found'), text: 'The end, with the secret.' },
      { id: 'end', text: 'The end.' },
    ],
  }
}
