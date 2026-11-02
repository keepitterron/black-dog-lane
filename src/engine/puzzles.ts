// Puzzle widgets. Their state lives in flags under `<puzzleId>:<part>`; until a part is set,
// the widget shows its declared initial value.
import { test } from './conditions.ts'
import { emit, fail, setFlag, type Ctx } from './context.ts'
import { fillText } from './dog.ts'
import { runEffects } from './effects.ts'
import type { Puzzle } from './schema.ts'
import type { GameState } from './state.ts'

export type PuzzleInput =
  | { kind: 'dial'; dial: number; dir: 1 | -1 }
  | { kind: 'clock'; hand: 'h' | 'm'; dir: 1 | -1 }
  | { kind: 'tap'; target: string }
  | { kind: 'slide'; tile: number }
  | { kind: 'toggle'; cell: number }
  | { kind: 'trail'; view: string }

type Flags = GameState['flags']

const key = (puzzle: Puzzle, part: string) => `${puzzle.id}:${part}`
const mod = (n: number, m: number) => ((n % m) + m) % m

function readString(flags: Flags, puzzle: Puzzle, part: string, fallback: string): string {
  const value = flags[key(puzzle, part)]
  return typeof value === 'string' ? value : fallback
}

function readNumber(flags: Flags, puzzle: Puzzle, part: string, fallback: number): number {
  const value = flags[key(puzzle, part)]
  return typeof value === 'number' ? value : fallback
}

export function isSolved(puzzle: Puzzle, flags: Flags): boolean {
  return flags[key(puzzle, 'solved')] === true
}

export function dialValues(puzzle: Extract<Puzzle, { kind: 'dialLock' }>, flags: Flags): string[] {
  return puzzle.solution.map((_, i) => readString(flags, puzzle, `dial${i}`, puzzle.initial[i] ?? puzzle.symbols[0] ?? ''))
}

export function clockTime(puzzle: Extract<Puzzle, { kind: 'clockSet' }>, flags: Flags): { h: number; m: number } {
  return { h: readNumber(flags, puzzle, 'h', puzzle.initial.h), m: readNumber(flags, puzzle, 'm', puzzle.initial.m) }
}

export function progress(puzzle: Extract<Puzzle, { kind: 'sequence' | 'scent' }>, flags: Flags): number {
  return readNumber(flags, puzzle, 'progress', 0)
}

export function sliderTiles(puzzle: Extract<Puzzle, { kind: 'slider' }>, flags: Flags): number[] {
  return readString(flags, puzzle, 'tiles', puzzle.initial.join(',')).split(',').map(Number)
}

export function patternCells(puzzle: Extract<Puzzle, { kind: 'pattern' }>, flags: Flags): string {
  return readString(flags, puzzle, 'cells', puzzle.initial)
}

export function applyPuzzleInput(ctx: Ctx, puzzle: Puzzle, input: PuzzleInput): void {
  const { flags } = ctx.state
  if (isSolved(puzzle, flags)) return
  if (!test(puzzle.activeWhen, ctx.state)) {
    if (puzzle.inactiveSay) emit(ctx, { type: 'say', text: fillText(puzzle.inactiveSay) })
    return
  }
  const solved = apply(ctx, puzzle, input)
  if (solved === null) return fail(ctx, 'BAD_PUZZLE_INPUT', puzzle.id)
  if (!solved) return
  setFlag(ctx, key(puzzle, 'solved'), true)
  emit(ctx, { type: 'puzzleSolved', puzzle: puzzle.id })
  runEffects(ctx, puzzle.onSolve)
}

// Returns whether the puzzle is now solved, or null when the input doesn't fit the widget.
function apply(ctx: Ctx, puzzle: Puzzle, input: PuzzleInput): boolean | null {
  const { flags } = ctx.state
  switch (puzzle.kind) {
    case 'dialLock': {
      if (input.kind !== 'dial' || !Number.isInteger(input.dial) || input.dial < 0 || input.dial >= puzzle.solution.length) return null
      const values = dialValues(puzzle, flags)
      const at = puzzle.symbols.indexOf(values[input.dial] ?? '')
      const next = puzzle.symbols[mod(at + input.dir, puzzle.symbols.length)] ?? ''
      setFlag(ctx, key(puzzle, `dial${input.dial}`), next)
      return dialValues(puzzle, ctx.state.flags).every((value, i) => value === puzzle.solution[i])
    }
    case 'clockSet': {
      if (input.kind !== 'clock') return null
      const time = clockTime(puzzle, flags)
      if (input.hand === 'h') setFlag(ctx, key(puzzle, 'h'), mod(time.h + input.dir, 12))
      else setFlag(ctx, key(puzzle, 'm'), mod(time.m + input.dir * puzzle.minuteStep, 60))
      const now = clockTime(puzzle, ctx.state.flags)
      return now.h === puzzle.solution.h && now.m === puzzle.solution.m
    }
    case 'sequence': {
      if (input.kind !== 'tap' || !puzzle.targets.includes(input.target)) return null
      const done = progress(puzzle, flags)
      // A wrong tap starts over, but counts as the first tap if it is the first target.
      const next = input.target === puzzle.solution[done] ? done + 1 : input.target === puzzle.solution[0] ? 1 : 0
      setFlag(ctx, key(puzzle, 'progress'), next)
      return next === puzzle.solution.length
    }
    case 'slider': {
      const tiles = sliderTiles(puzzle, flags)
      if (input.kind !== 'slide' || !Number.isInteger(input.tile) || input.tile < 0 || input.tile >= tiles.length) return null
      const gap = tiles.indexOf(0)
      const { size } = puzzle
      const [r, c, gr, gc] = [Math.floor(input.tile / size), input.tile % size, Math.floor(gap / size), gap % size]
      // Tapping a tile that isn't next to the gap does nothing.
      if (Math.abs(r - gr) + Math.abs(c - gc) !== 1) return false
      const moved = tiles.with(gap, tiles[input.tile] ?? 0).with(input.tile, 0)
      setFlag(ctx, key(puzzle, 'tiles'), moved.join(','))
      return moved.join(',') === puzzle.solution.join(',')
    }
    case 'pattern': {
      const { rows, cols } = puzzle
      if (input.kind !== 'toggle' || !Number.isInteger(input.cell) || input.cell < 0 || input.cell >= rows * cols) return null
      const cells = patternCells(puzzle, flags).split('')
      const r = Math.floor(input.cell / cols)
      const c = input.cell % cols
      const hits = puzzle.mode === 'single' ? [[r, c]] : [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      for (const [hr = 0, hc = 0] of hits) {
        if (hr < 0 || hr >= rows || hc < 0 || hc >= cols) continue
        const i = hr * cols + hc
        cells[i] = cells[i] === '1' ? '0' : '1'
      }
      setFlag(ctx, key(puzzle, 'cells'), cells.join(''))
      return cells.join('') === puzzle.solution
    }
    case 'scent': {
      if (input.kind !== 'trail') return null
      const done = progress(puzzle, flags)
      // The dog follows the trail in order; tapping off the trail does nothing.
      if (input.view !== puzzle.trail[done]) return false
      setFlag(ctx, key(puzzle, 'progress'), done + 1)
      return done + 1 === puzzle.trail.length
    }
  }
}
