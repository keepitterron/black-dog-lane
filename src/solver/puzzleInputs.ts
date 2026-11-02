// Inputs that take a puzzle widget from its current state to its declared solution. The
// solver feeds them to the real engine as one "solve" action.
import { clockTime, dialValues, patternCells, progress, sliderTiles, type PuzzleInput } from '../engine/puzzles.ts'
import type { Puzzle } from '../engine/schema.ts'
import type { GameState } from '../engine/state.ts'

// Sliders are searched with A*; past this many expanded boards the solver gives up and reports
// the search as truncated.
export const SLIDER_MAX_BOARDS = 200_000

// `null` means the search gave up; `[]` means there is no way to solve it from here.
export function solutionInputs(puzzle: Puzzle, flags: GameState['flags']): PuzzleInput[] | null {
  const inputs: PuzzleInput[] = []
  switch (puzzle.kind) {
    case 'dialLock': {
      dialValues(puzzle, flags).forEach((value, dial) => {
        const from = puzzle.symbols.indexOf(value)
        const to = puzzle.symbols.indexOf(puzzle.solution[dial] ?? '')
        const turns = (to - from + puzzle.symbols.length) % puzzle.symbols.length
        for (let i = 0; i < turns; i++) inputs.push({ kind: 'dial', dial, dir: 1 })
      })
      return inputs
    }
    case 'clockSet': {
      const now = clockTime(puzzle, flags)
      for (let i = 0; i < (puzzle.solution.h - now.h + 12) % 12; i++) inputs.push({ kind: 'clock', hand: 'h', dir: 1 })
      const minuteTurns = ((puzzle.solution.m - now.m + 60) % 60) / puzzle.minuteStep
      for (let i = 0; i < minuteTurns; i++) inputs.push({ kind: 'clock', hand: 'm', dir: 1 })
      return inputs
    }
    case 'sequence':
      return puzzle.solution.map(target => ({ kind: 'tap', target }))
    case 'trail':
      return puzzle.trail.slice(progress(puzzle, flags)).map(view => ({ kind: 'trail', view }))
    case 'slider': {
      const moves = slideTiles(sliderTiles(puzzle, flags), puzzle.solution, puzzle.size)
      return moves && moves.map(tile => ({ kind: 'slide', tile }))
    }
    case 'pattern': {
      const cells = toggleCells(patternCells(puzzle, flags), puzzle.solution, puzzle.rows, puzzle.cols, puzzle.mode)
      return cells.map(cell => ({ kind: 'toggle', cell }))
    }
  }
}

const sorted = (tiles: number[]) => tiles.toSorted((a, b) => a - b).join()

// The tile indexes to tap, in order, to slide `from` into `to` (row-major, 0 is the gap).
export function slideTiles(from: number[], to: number[], size: number): number[] | null {
  if (sorted(from) !== sorted(to)) return []
  if (!sliderSolvable(from, to, size)) return []
  const goal = to.join(',')
  const home = new Map(to.map((tile, i) => [tile, i]))
  const distance = (tiles: number[]) =>
    tiles.reduce((sum, tile, i) => {
      if (tile === 0) return sum
      const j = home.get(tile) ?? i
      return sum + Math.abs(Math.floor(i / size) - Math.floor(j / size)) + Math.abs((i % size) - (j % size))
    }, 0)

  type Board = { tiles: number[]; g: number; f: number; prev: string | null; tap: number }
  const best = new Map<string, Board>()
  // A bucket queue by f: f is a small integer, and with a consistent heuristic it never drops.
  const buckets: Board[][] = []
  let lowest = 0
  const push = (board: Board) => {
    ;(buckets[board.f] ??= []).push(board)
    lowest = Math.min(lowest, board.f)
  }
  const pop = (): Board | undefined => {
    while (lowest < buckets.length && !buckets[lowest]?.length) lowest++
    return buckets[lowest]?.pop()
  }
  const start: Board = { tiles: from, g: 0, f: distance(from), prev: null, tap: -1 }
  best.set(from.join(','), start)
  push(start)
  let expanded = 0
  for (let board = pop(); board; board = pop()) {
    const k = board.tiles.join(',')
    if (best.get(k) !== board) continue
    if (k === goal) {
      const taps: number[] = []
      for (let at: Board | undefined = board; at && at.prev !== null; at = best.get(at.prev)) taps.push(at.tap)
      return taps.toReversed()
    }
    if (++expanded > SLIDER_MAX_BOARDS) return null
    const gap = board.tiles.indexOf(0)
    const [gr, gc] = [Math.floor(gap / size), gap % size]
    for (const [r, c] of [[gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]] as const) {
      if (r < 0 || r >= size || c < 0 || c >= size) continue
      const tap = r * size + c
      const tiles = board.tiles.with(gap, board.tiles[tap] ?? 0).with(tap, 0)
      const nk = tiles.join(',')
      const g = board.g + 1
      const known = best.get(nk)
      if (known && known.g <= g) continue
      const next: Board = { tiles, g, f: g + distance(tiles), prev: k, tap }
      best.set(nk, next)
      push(next)
    }
  }
  return []
}

// A board can reach another exactly when the permutation between them and the distance the
// gap travels have the same parity.
function sliderSolvable(from: number[], to: number[], size: number): boolean {
  const where = new Map(to.map((tile, i) => [tile, i]))
  const perm = from.map(tile => where.get(tile) ?? 0)
  let swaps = 0
  const visited = new Set<number>()
  for (let i = 0; i < perm.length; i++) {
    let length = 0
    for (let j = i; !visited.has(j); j = perm[j] ?? j) {
      visited.add(j)
      length++
    }
    if (length > 0) swaps += length - 1
  }
  const [a, b] = [from.indexOf(0), to.indexOf(0)]
  const gapMoves = Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs((a % size) - (b % size))
  return (swaps + gapMoves) % 2 === 0
}

// The cells to toggle (each once, any order) to turn `from` into `to`. In `cross` mode a toggle
// also flips the four neighbours, so this solves the system over GF(2). Empty when the two
// already match or when no set of toggles works.
export function toggleCells(from: string, to: string, rows: number, cols: number, mode: 'single' | 'cross'): number[] {
  const n = rows * cols
  const diff = Array.from({ length: n }, (_, i) => from[i] !== to[i])
  if (mode === 'single') return diff.flatMap((d, i) => (d ? [i] : []))
  if (!diff.includes(true)) return []

  // Row i: which presses flip cell i, with the wanted flip in bit n.
  const eqs = Array.from({ length: n }, (_, i) => {
    const [r, c] = [Math.floor(i / cols), i % cols]
    let row = diff[i] ? 2 ** n : 0
    for (const [hr, hc] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as const) {
      if (hr >= 0 && hr < rows && hc >= 0 && hc < cols) row += 2 ** (hr * cols + hc)
    }
    return row
  })
  // n ≤ 25, so n + 1 bits fit in a 32-bit int for the XOR below.
  const pivots: number[] = []
  let rank = 0
  for (let col = 0; col < n && rank < n; col++) {
    const bit = 2 ** col
    const found = eqs.findIndex((row, i) => i >= rank && (row & bit) !== 0)
    if (found < 0) continue
    ;[eqs[rank], eqs[found]] = [eqs[found] ?? 0, eqs[rank] ?? 0]
    for (let i = 0; i < n; i++) if (i !== rank && ((eqs[i] ?? 0) & bit) !== 0) eqs[i] = (eqs[i] ?? 0) ^ (eqs[rank] ?? 0)
    pivots.push(col)
    rank++
  }
  if (eqs.slice(rank).some(row => row !== 0)) return []
  return pivots.flatMap((col, i) => ((eqs[i] ?? 0) & 2 ** n ? [col] : []))
}
