// The interactive part of a puzzle close-up, drawn on top of the view's art. Each widget
// kind has a fixed layout on the 800×600 close-up template.
import { sym } from '../../art/kit.ts'
import { dialValues } from '../../engine/puzzles.ts'
import type { PuzzleInput } from '../../engine/puzzles.ts'
import type { Puzzle } from '../../engine/schema.ts'
import type { GameState } from '../../engine/state.ts'

type Props = { puzzle: Puzzle; flags: GameState['flags']; onInput: (input: PuzzleInput) => void }

export function PuzzleWidget({ puzzle, flags, onInput }: Props) {
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
    case 'sequence':
    case 'slider':
    case 'pattern':
    case 'scent':
      // Not used by any level yet; their widgets arrive with the levels that need them.
      return null
  }
}
