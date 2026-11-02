// The interactive part of a puzzle close-up, drawn on top of the view's art. Each widget
// kind has a fixed layout on the 800×600 close-up template.
import { ASSETS } from '../../art/assets/index.ts'
import { sym, SYMBOLS } from '../../art/kit.ts'
import type { Palette } from '../../art/palettes.ts'
import { isAssetId } from '../../catalog/assets.ts'
import { MIN_TAP_UNITS } from '../../engine/layout.ts'
import { dialValues, patternCells, progress, sliderTiles } from '../../engine/puzzles.ts'
import type { PuzzleInput } from '../../engine/puzzles.ts'
import type { Puzzle } from '../../engine/schema.ts'
import type { GameState } from '../../engine/state.ts'

type Props = { puzzle: Puzzle; flags: GameState['flags']; pal: Palette; onInput: (input: PuzzleInput) => void }

const isSymbol = (id: string) => (SYMBOLS as readonly string[]).includes(id)

// A target's face: a code symbol, a prop drawing, or failing both its position number.
function face(id: string, i: number, x: number, y: number, size: number, flags: GameState['flags'], pal: Palette): string {
  if (isSymbol(id)) return sym(id, x, y, size * 0.32, '#d8ccb2', false, 3.5)
  if (isAssetId(id)) return `<g transform="translate(${x} ${y}) scale(${(size / 70).toFixed(2)})">${ASSETS[id]({}, { flags, pal })}</g>`
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${size * 0.4}" fill="#d8ccb2">${i + 1}</text>`
}

// Rows × cols cells of `cell` units, centred on the close-up a little above the middle.
function grid(rows: number, cols: number, cell: number, gap: number) {
  const w = cols * cell + (cols - 1) * gap
  const h = rows * cell + (rows - 1) * gap
  return (i: number) => ({ x: 400 - w / 2 + (i % cols) * (cell + gap), y: 280 - h / 2 + Math.floor(i / cols) * (cell + gap) })
}

export function PuzzleWidget({ puzzle, flags, pal, onInput }: Props) {
  switch (puzzle.kind) {
    case 'dialLock': {
      const values = dialValues(puzzle, flags)
      const width = values.length * 110 - 20
      return (
        <g>
          {values.map((value, dial) => {
            const x = 400 - width / 2 + dial * 110
            return (
              <g key={dial} className="hs" onClick={() => onInput({ kind: 'dial', dial, dir: 1 })} role="button" aria-label={`Dial ${dial + 1}`}>
                <rect x={x} y={170} width={90} height={120} rx={6} fill="#1e1712" stroke="#5a4220" strokeWidth={3} />
                <path d={`M${x + 38} 183 l7 -7 l7 7`} stroke="#6b5a46" strokeWidth={2} fill="none" />
                <g dangerouslySetInnerHTML={{ __html: sym(value, x + 45, 235, 28, '#d8ccb2', false, 3.5) }} />
              </g>
            )
          })}
        </g>
      )
    }
    case 'clockSet':
      return (
        <g>
          {(['h', 'm'] as const).map(hand => (
            <circle
              key={hand}
              className="hs"
              cx={hand === 'h' ? 340 : 460}
              cy={345}
              r={50}
              fill="transparent"
              role="button"
              aria-label={hand === 'h' ? 'Hour winding hole' : 'Minute winding hole'}
              onClick={() => onInput({ kind: 'clock', hand, dir: 1 })}
            />
          ))}
        </g>
      )
    case 'sequence': {
      // Targets in rows of up to four; a lamp lights for each correct tap so far.
      const done = progress(puzzle, flags)
      const n = puzzle.targets.length
      const cols = Math.min(n, 4)
      const at = grid(Math.ceil(n / cols), cols, 130, 24)
      return (
        <g>
          {puzzle.targets.map((target, i) => {
            const { x, y } = at(i)
            return (
              <g key={target} className="hs" onClick={() => onInput({ kind: 'tap', target })} role="button" aria-label={`Target ${i + 1}`}>
                <rect x={x} y={y} width={130} height={130} rx={10} fill="#1e1712" stroke="#5a4220" strokeWidth={3} />
                <g dangerouslySetInnerHTML={{ __html: face(target, i, x + 65, y + 65, 130, flags, pal) }} />
              </g>
            )
          })}
          {puzzle.solution.map((_, i) => (
            <circle key={i} cx={400 + (i - (puzzle.solution.length - 1) / 2) * 34} cy={500} r={10} fill={i < done ? '#e3a84b' : '#1e1712'} stroke="#5a4220" strokeWidth={2} />
          ))}
        </g>
      )
    }
    case 'slider': {
      // Numbered tiles; tap one next to the gap to slide it in.
      const tiles = sliderTiles(puzzle, flags)
      const { size } = puzzle
      const cell = Math.min(110, Math.floor(400 / size))
      const at = grid(size, size, cell, 6)
      return (
        <g>
          {tiles.map((tile, i) => {
            if (tile === 0) return null
            const { x, y } = at(i)
            return (
              <g key={tile} className="hs tile" style={{ transform: `translate(${x}px, ${y}px)` }} onClick={() => onInput({ kind: 'slide', tile: i })} role="button" aria-label={`Tile ${tile}`}>
                <rect width={cell} height={cell} rx={6} fill="#d8ccb2" stroke="#5a4220" strokeWidth={3} />
                <text x={cell / 2} y={cell / 2} textAnchor="middle" dominantBaseline="central" fontSize={cell * 0.42} fill="#3a2a20">
                  {tile}
                </text>
              </g>
            )
          })}
        </g>
      )
    }
    case 'pattern': {
      // Lamps in a grid; tapping one toggles it (and its neighbours in `cross` mode).
      const cells = patternCells(puzzle, flags)
      // Never under the 44 px tap minimum, so a 5×5 grid fills most of the close-up.
      const cell = Math.max(MIN_TAP_UNITS, Math.min(110, Math.floor(500 / Math.max(puzzle.rows, puzzle.cols))))
      const at = grid(puzzle.rows, puzzle.cols, cell, 6)
      return (
        <g>
          {cells.split('').map((lit, i) => {
            const { x, y } = at(i)
            return (
              <g key={i} className="hs" onClick={() => onInput({ kind: 'toggle', cell: i })} role="button" aria-label={`Lamp ${i + 1}`} aria-pressed={lit === '1'}>
                <rect x={x} y={y} width={cell} height={cell} rx={8} fill="#1e1712" stroke="#5a4220" strokeWidth={3} />
                <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.3} fill={lit === '1' ? '#e3a84b' : '#3a2a20'} />
                {lit === '1' && <circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.45} fill="#e3a84b" opacity={0.15} />}
              </g>
            )
          })}
        </g>
      )
    }
    case 'trail':
      // Not a close-up: Scene makes the trail marks on the walls tappable.
      return null
  }
}
