// Builds levels/test/broken/<CODE>.json: the strict fixture with one change that breaks
// exactly one validator rule. tests/validate.test.ts checks each file reports only its code.
// Run `npm run fixtures` after editing.
import type { CHECK_CODES } from '../../src/solver/validate.ts'
import type { Chapter, Cond, Hotspot, Level, Room } from '../../src/engine/schema.ts'
import { strict, strictChapter } from './strict.ts'

type Code = (typeof CHECK_CODES)[number]

const F = (flag: string): Cond => ({ op: 'flag', flag })
const ALL = (...conds: Cond[]): Cond => ({ op: 'all', conds })

function hotspot(level: Level, id: string): Hotspot {
  for (const ch of level.chapters)
    for (const room of ch.rooms)
      for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)]) {
        const found = view.hotspots.find(h => h.id === id)
        if (found) return found
      }
  throw new Error(`no hotspot ${id}`)
}

const room = (ch: Chapter) => {
  const r = ch.rooms[0]
  if (!r) throw new Error(`no room in ${ch.id}`)
  return r
}

const dial = (ch: Chapter) => {
  const p = ch.puzzles[0]
  if (!p) throw new Error(`no puzzle in ${ch.id}`)
  return p
}

const bareWall = () => ({ layers: [{ asset: 'roomShell' }], hotspots: [] })
const sideRoom = (id: string): Room => ({ id, walls: { n: bareWall(), e: bareWall(), s: bareWall(), w: bareWall() }, closeUps: {} })

const broken = (change: (level: Level) => void) => (): Level => {
  const level = strict()
  change(level)
  return level
}

export const BROKEN: Record<Code, () => unknown> = {
  // The lock in chapter 3 can never be used.
  UNSOLVABLE: broken(({ chapters: [, , c3] }) => {
    dial(c3).activeWhen = F('never')
  }),
  // A tap in chapter 2 jams the lock for good.
  DEAD_END: broken(({ chapters: [, c2] }) => {
    room(c2).walls.s.hotspots.push({ id: 'c2jam', rect: [60, 60, 140, 140], rules: [{ do: [{ do: 'setFlag', flag: 'c2jammed', value: true }] }] })
    dial(c2).activeWhen = ALL(F('c2a6'), F('c2b6'), { op: 'not', cond: F('c2jammed') })
  }),
  CHAPTER_COUNT: () => {
    const { chapters, ...rest } = strict()
    return { ...rest, chapters: chapters.slice(0, 2) }
  },
  // A tap that only describes, and isn't a clue.
  ORPHAN_HOTSPOT: broken(({ chapters: [c1] }) => {
    room(c1).walls.e.hotspots.push({ id: 'c1flavour', rect: [60, 60, 140, 140], rules: [{ do: [{ do: 'say', text: 'Just a wall.' }] }] })
  }),
  // A thread step dressed up as a clue, on a wall no puzzle uses.
  FALSE_CLUE: broken(level => {
    hotspot(level, 'c1a1').looksLikeClue = true
  }),
  // Nothing to hint at between opening the lock and leaving chapter 1.
  HINT_GAP: broken(({ chapters: [c1] }) => {
    c1.objectives = c1.objectives.filter(o => o.id !== 'c1oOut')
  }),
  // The secret's mark looks like every other layer.
  SECRET_NO_TELL: broken(({ chapters: [c1] }) => {
    const mark = room(c1).walls.s.layers.find(l => l.id === 'c1mark')
    if (mark) delete mark.visibleWhen
  }),
  // A hotspot hanging off the right edge of the scene.
  TAP_TARGET: broken(level => {
    hotspot(level, 'c2b1').rect = [740, 360, 40, 40]
  }),
  // A beat on leaving chapter 1, but the same tap ends the chapter first.
  BEAT_LOST: broken(({ chapters: [c1] }) => {
    c1.beats.push({ id: 'c1byeBeat', on: { type: 'afterFlag', flag: 'c1left' }, once: true, do: [{ do: 'say', text: 'Bye.' }] })
  }),
  // Chapter 1 is too short.
  LENGTH: broken(level => {
    level.chapters[0] = strictChapter('c1', { steps: 3 })
    const south = room(level.chapters[0]).walls.s
    south.layers.push({ id: 'c1mark', asset: 'roomShell', visibleWhen: { op: 'not', cond: F('c1found') } })
    south.hotspots.push({ id: 'c1odd', rect: [60, 60, 140, 140], visibleWhen: { op: 'not', cond: F('c1found') }, rules: [{ do: [{ do: 'setFlag', flag: 'c1found', value: true }] }] })
  }),
  // Chapter 1's threads run one after the other, and the lock only shows up at the end.
  SINGLE_THREAD: broken(level => {
    const [c1] = level.chapters
    for (let i = 1; i <= 6; i++) {
      const spot = hotspot(level, `c1b${i}`)
      spot.visibleWhen = ALL(F('c1a6'), ...(spot.visibleWhen ? [spot.visibleWhen] : []))
    }
    for (const o of c1.objectives) {
      if (o.id === 'c1oB') o.availableWhen = F('c1a6')
      if (o.id === 'c1oLock') o.availableWhen = F('c1b6')
    }
  }),
  // Chapter 1's lock needs only one clue: the sign and its close-up go.
  SINGLE_SOURCE: broken(({ chapters: [c1] }) => {
    const r = room(c1)
    dial(c1).clues = ['c1noteC']
    r.walls.w.hotspots = r.walls.w.hotspots.filter(h => h.id !== 'c1sign')
    delete r.closeUps['c1signC']
  }),
  // Thread A's second step is the first hotspot tapped again.
  BUSYWORK: broken(level => {
    const first = hotspot(level, 'c1a1')
    first.visibleWhen = { op: 'not', cond: F('c1a2') }
    first.rules = [
      { when: { op: 'not', cond: F('c1a1') }, do: [{ do: 'setFlag', flag: 'c1a1', value: true }] },
      { do: [{ do: 'setFlag', flag: 'c1a2', value: true }] },
    ]
    const n = room(level.chapters[0]).walls.n
    n.hotspots = n.hotspots.filter(h => h.id !== 'c1a2')
  }),
  // A door into a side room whose way back only opens after the first tap of thread A.
  ONE_WAY_DOOR: broken(({ chapters: [c1] }) => {
    room(c1).walls.e.hotspots.push({ id: 'c1in', rect: [60, 60, 140, 140], rules: [{ do: [{ do: 'goto', room: 'c1side' }] }] })
    const side = sideRoom('c1side')
    side.walls.n.hotspots.push({ id: 'c1back', rect: [330, 60, 140, 140], rules: [{ when: F('c1a1'), do: [{ do: 'goto', room: 'c1r', wall: 'e' }] }] })
    c1.rooms.push(side)
  }),
  // A room in chapter 1 with no door leading in.
  ROOM_UNREACHABLE: broken(({ chapters: [c1] }) => {
    c1.rooms.push(sideRoom('c1side'))
  }),
  // Chapter 2 ends without a payoff.
  NO_PAYOFF: broken(({ chapters: [, c2] }) => {
    delete c2.outro
  }),
  // Chapter 1 has no beats at all.
  BEAT_SPARSE: broken(({ chapters: [c1] }) => {
    c1.beats = []
  }),
  // A wallpaper the catalog doesn't have.
  ASSET_REF: broken(({ chapters: [c1] }) => {
    room(c1).walls.e.layers.push({ asset: 'roomShell', params: { pattern: 'tartan' } })
  }),
}
