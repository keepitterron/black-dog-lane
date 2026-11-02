import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel, play, room } from '../../tests/fixture.ts'
import type { Level, Puzzle } from '../engine/schema.ts'
import { newGame } from '../engine/state.ts'
import { slideTiles, solutionInputs, toggleCells } from './puzzleInputs.ts'
import { explore, reachableRooms, shortestPath, solve } from './solve.ts'

// Puts `puzzle` in close-up `cu` of chapter 1, and makes solving it finish chapter 1. Chapters
// 2 and 3 end at a single tap.
function levelWith(puzzle: Puzzle): Level {
  const level = baseLevel()
  level.chapters[0].puzzles.push(puzzle)
  level.chapters[0].rooms[0]!.closeUps['cu'] = { layers: [], hotspots: [], puzzle: puzzle.id }
  for (const ch of level.chapters) {
    addHotspot(level, `${ch.id}r/n`, { id: `${ch.id}exit`, rules: [{ when: ch.exitWhen, do: [{ do: 'endChapter' }] }] })
  }
  for (const ch of level.chapters.slice(1)) {
    addHotspot(level, `${ch.id}r/e`, { id: `${ch.id}go`, rules: [{ do: [{ do: 'setFlag', flag: `${ch.id}done`, value: true }] }] })
  }
  return level
}

const base = { id: 'p1', clues: [], onSolve: [{ do: 'setFlag' as const, flag: 'c1done', value: true }] }

// Plays the solver's inputs through the real engine and reports whether the puzzle solved.
function solvesInEngine(puzzle: Puzzle): boolean {
  const level = levelWith(puzzle)
  const state = { ...newGame(level), location: { ...newGame(level).location, closeUps: ['cu'] } }
  const inputs = solutionInputs(puzzle, state.flags) ?? []
  const after = play(level, inputs.map(input => ({ type: 'puzzleInput', puzzle: puzzle.id, input }) as const), state)
  return after.state.flags['p1:solved'] === true
}

describe('slider inputs', () => {
  test('solve a scrambled 3×3 board in the engine', () => {
    const puzzle: Puzzle = { ...base, kind: 'slider', size: 3, initial: [8, 1, 3, 4, 0, 2, 7, 6, 5], solution: [1, 2, 3, 4, 5, 6, 7, 8, 0] }
    expect(solvesInEngine(puzzle)).toBe(true)
  })

  test('solve a 4×4 board a few dozen moves out', () => {
    const solution = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]
    const initial = [5, 1, 2, 4, 9, 6, 3, 8, 13, 10, 7, 11, 0, 14, 15, 12]
    expect(slideTiles(initial, solution, 4)?.length).toBeGreaterThan(0)
    expect(solvesInEngine({ ...base, kind: 'slider', size: 4, initial, solution })).toBe(true)
  })

  test('an impossible board has no inputs', () => {
    expect(slideTiles([2, 1, 3, 0], [1, 2, 3, 0], 2)).toEqual([])
  })
})

describe('pattern inputs', () => {
  test('single mode toggles the cells that differ', () => {
    expect(toggleCells('0110', '1100', 2, 2, 'single')).toEqual([0, 2])
  })

  test('cross mode solves in the engine', () => {
    const puzzle: Puzzle = { ...base, kind: 'pattern', rows: 3, cols: 3, initial: '000000000', solution: '110100011', mode: 'cross' }
    expect(solvesInEngine(puzzle)).toBe(true)
  })

  test('cross mode with no solution has no inputs', () => {
    // On a 4×4 grid some patterns can't be reached with cross toggles.
    expect(toggleCells('0000000000000000', '1000000000000000', 4, 4, 'cross')).toEqual([])
  })
})

describe('explore', () => {
  test('a level gated by a slider is solvable, and the shortest path ends the game', () => {
    const level = levelWith({ ...base, kind: 'slider', size: 2, initial: [0, 1, 3, 2], solution: [1, 2, 3, 0] })
    expect(solve(level)).toMatchObject({ solvable: true, deadEnds: 0, truncated: false })
    const path = shortestPath(explore(level))
    expect(path.at(-1)?.to.state.ended).toBe('end')
    expect(path.map(s => s.via.kind)).toContain('puzzle')
  })

  test('a trail across two walls and a close-up is walked as one step', () => {
    const level = levelWith({ ...base, kind: 'trail', trail: ['c1r/e', 'c1r/s', 'cu'] })
    expect(solve(level)).toMatchObject({ solvable: true, deadEnds: 0 })
    expect(shortestPath(explore(level)).filter(s => s.via.kind === 'puzzle')).toHaveLength(1)
  })

  test('an impossible slider makes the level unsolvable', () => {
    const level = levelWith({ ...base, kind: 'slider', size: 2, initial: [2, 1, 3, 0], solution: [1, 2, 3, 0] })
    expect(solve(level).solvable).toBe(false)
  })
})

describe('rooms', () => {
  // Chapter 1 ends in room c1x, behind a door in c1r that a lever opens; chapters 2 and 3 end
  // at a single tap.
  function behindDoor(withLever: boolean): Level {
    const level = levelWith({ ...base, kind: 'slider', size: 2, initial: [1, 2, 3, 0], solution: [1, 2, 3, 0] })
    const [c1] = level.chapters
    c1.rooms.push(room('c1x'))
    if (withLever) addHotspot(level, 'c1r/e', { id: 'lever', rules: [{ do: [{ do: 'setFlag', flag: 'opened', value: true }] }] })
    addHotspot(level, 'c1r/w', { id: 'door', rules: [{ when: { op: 'flag', flag: 'opened' }, do: [{ do: 'goto', room: 'c1x' }] }, { do: [{ do: 'say', text: 'Shut.' }] }] })
    addHotspot(level, 'c1x/s', { id: 'back', rules: [{ do: [{ do: 'goto', room: 'c1r', wall: 'w' }] }] })
    addHotspot(level, 'c1x/n', { id: 'c1go', rules: [{ do: [{ do: 'setFlag', flag: 'c1done', value: true }] }] })
    return level
  }

  test('a room behind a shut door is out of reach until it opens', () => {
    const level = behindDoor(true)
    const start = newGame(level)
    expect([...reachableRooms(level, level.chapters[0], start)]).toEqual(['c1r'])
    expect([...reachableRooms(level, level.chapters[0], { ...start, flags: { opened: true } })].toSorted()).toEqual(['c1r', 'c1x'])
    const path = shortestPath(explore(level)).map(s => s.via)
    expect(path.findIndex(v => v.kind === 'hotspot' && v.id === 'lever')).toBeLessThan(path.findIndex(v => v.kind === 'hotspot' && v.id === 'c1go'))
  })

  test('with no way to open the door the level is unsolvable', () => {
    const level = behindDoor(false)
    expect(solve(level).solvable).toBe(false)
    expect(explore(level).reachedRooms.has('c1x')).toBe(false)
  })
})
