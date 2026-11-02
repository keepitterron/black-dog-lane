// A tiny in-memory level with one close-up per puzzle widget and a three-mark trail round the
// walls, so the dev gallery can play every widget through the real reducer. Never shipped.
import type { Chapter, Level, Puzzle, Room, View } from '../../engine/schema.ts'

const say = (text: string) => [{ do: 'say' as const, text }]
const base = { clues: [], onSolve: say('Solved.') }

export const DEMO_PUZZLES: Puzzle[] = [
  { ...base, id: 'dial', kind: 'dialLock', symbols: ['moon', 'eye', 'key', 'bird'], initial: ['moon', 'moon', 'moon'], solution: ['eye', 'key', 'bird'] },
  { ...base, id: 'clock', kind: 'clockSet', initial: { h: 3, m: 45 }, solution: { h: 6, m: 0 }, minuteStep: 15 },
  { ...base, id: 'sequence', kind: 'sequence', targets: ['moon', 'eye', 'sun', 'star'], solution: ['sun', 'moon', 'star'] },
  { ...base, id: 'slider', kind: 'slider', size: 3, initial: [1, 2, 3, 4, 5, 6, 7, 0, 8], solution: [1, 2, 3, 4, 5, 6, 7, 8, 0] },
  { ...base, id: 'pattern', kind: 'pattern', rows: 3, cols: 3, initial: '000000000', solution: '010111010', mode: 'cross' },
  { ...base, id: 'trail', kind: 'trail', trail: ['demo/n', 'demo/e', 'demo/s'] },
]

const CLOSE_UP_ART: Record<string, View['layers']> = {
  dial: [{ asset: 'lockPlateClose' }],
  clock: [{ asset: 'clockFaceClose', params: { puzzle: 'clock', h: 3, m: 45 } }],
  sequence: [{ asset: 'panelClose', params: { style: 'brass' } }],
  slider: [{ asset: 'panelClose' }],
  pattern: [{ asset: 'panelClose', params: { style: 'paper' } }],
}

const mark = (symbol: string, slot: string): View => ({
  layers: [{ asset: 'roomShell' }, { asset: 'trailMark', params: { puzzle: 'trail', symbol, slot } }],
  hotspots: [],
})

const bare = (): View => ({ layers: [], hotspots: [] })

// Chapter 1 holds everything; 2 and 3 exist because every level has three.
function chapter(id: string, demo: boolean): Chapter {
  const room: Room = demo
    ? {
        id: 'demo',
        walls: { n: mark('hand', 'left'), e: mark('eye', 'centre'), s: mark('moon', 'floor'), w: { layers: [{ asset: 'roomShell' }], hotspots: [] } },
        closeUps: Object.fromEntries(Object.entries(CLOSE_UP_ART).map(([puzzle, layers]) => [puzzle, { layers, hotspots: [], puzzle }])),
      }
    : { id: `${id}r`, walls: { n: bare(), e: bare(), s: bare(), w: bare() }, closeUps: {} }
  return {
    id,
    intro: 'Widgets.',
    start: { room: room.id, wall: 'n' },
    rooms: [room],
    puzzles: demo ? DEMO_PUZZLES : [],
    beats: [],
    objectives: [],
    exitWhen: { op: 'flag', flag: 'never' },
  }
}

export function demoLevel(palette: string): Level {
  return {
    id: 'demo',
    schema: 1,
    title: 'Widgets',
    theme: 'dev',
    palette,
    items: {},
    combos: [],
    chapters: [chapter('d1', true), chapter('d2', false), chapter('d3', false)],
    secrets: [],
    endings: [{ id: 'end', text: 'End.' }],
  }
}
