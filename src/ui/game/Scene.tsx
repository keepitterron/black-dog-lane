// Draws the current view: the level's art layers, then transparent hotspots so art never
// blocks a tap, then the puzzle widget's controls on top of everything. Swipe or arrows turn; Back leaves a close-up.
import { useEffect, useRef } from 'react'
import { renderAsset } from '../../art/assets/index.ts'
import { placedRect } from '../../catalog/assets.ts'
import { sceneDefs } from '../../art/kit.ts'
import { paletteFor } from '../../art/palettes.ts'
import { test } from '../../engine/conditions.ts'
import { currentViewId } from '../../engine/context.ts'
import { lookup } from '../../engine/lookup.ts'
import type { PuzzleInput } from '../../engine/puzzles.ts'
import type { Level } from '../../engine/schema.ts'
import type { GameState } from '../../engine/state.ts'
import { padRect } from './hitRect.ts'
import { PuzzleWidget } from './PuzzleWidget.tsx'
import styles from './Scene.module.css'

type Props = {
  level: Level
  state: GameState
  onHotspot: (id: string) => void
  onPuzzle: (puzzle: string, input: PuzzleInput) => void
  onTurn: (dir: 'left' | 'right') => void
  onBack: () => void
  children?: React.ReactNode
}

export function Scene({ level, state, onHotspot, onPuzzle, onTurn, onBack, children }: Props) {
  const idx = lookup(level)
  const viewId = currentViewId(state)
  const entry = idx.views.get(viewId)
  const closeUp = state.location.closeUps.length > 0
  const swipe = useRef<{ x: number; swiped: boolean } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onTurn('left')
      if (e.key === 'ArrowRight') onTurn('right')
      if (e.key === 'Escape' || e.key === 'ArrowDown') onBack()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onTurn, onBack])

  if (!entry) return null
  const pal = paletteFor(level.palette)
  const ctx = { flags: state.flags, pal, art: level.art }
  const art = entry.view.layers
    .filter(layer => test(layer.visibleWhen, state))
    .map(layer => renderAsset(layer.asset, layer.params ?? {}, ctx))
    .join('')
  const puzzle = entry.view.puzzle ? idx.puzzles.get(entry.view.puzzle)?.puzzle : undefined
  // Trail marks on this view that belong to an unsolved trail through it.
  const marks = entry.view.layers.flatMap(layer => {
    const id = layer.params?.['puzzle']
    const trail = typeof id === 'string' ? idx.puzzles.get(id)?.puzzle : undefined
    if (layer.asset !== 'trailMark' || trail?.kind !== 'trail' || !trail.trail.includes(viewId) || !test(layer.visibleWhen, state)) return []
    const rect = placedRect(layer.asset, layer.params ?? {})
    return rect ? [{ puzzle: trail.id, rect }] : []
  })

  return (
    <div
      className={styles.stage}
      onPointerDown={e => (swipe.current = { x: e.clientX, swiped: false })}
      onPointerUp={e => {
        const start = swipe.current
        if (!start || closeUp) return
        const dx = e.clientX - start.x
        if (Math.abs(dx) > 60) {
          start.swiped = true
          onTurn(dx < 0 ? 'right' : 'left')
        }
      }}
      onClickCapture={e => {
        if (swipe.current?.swiped) {
          e.stopPropagation()
          swipe.current = null
        }
      }}
    >
      <svg key={viewId} className={styles.scene} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-label="Scene">
        <g dangerouslySetInnerHTML={{ __html: sceneDefs(pal) + art }} />
        {entry.view.hotspots
          .filter(h => test(h.visibleWhen, state))
          .map(h => {
            const [x, y, w, height] = padRect(h.rect)
            return <rect key={h.id} className="hs" data-hotspot={h.id} x={x} y={y} width={w} height={height} fill="transparent" onClick={() => onHotspot(h.id)} />
          })}
        {marks.map(({ puzzle: id, rect }) => {
          const [x, y, w, height] = padRect(rect)
          return <rect key={id} className="hs" data-trail={id} x={x} y={y} width={w} height={height} fill="transparent" onClick={() => onPuzzle(id, { kind: 'trail', view: viewId })} />
        })}
        {puzzle && <PuzzleWidget puzzle={puzzle} ctx={ctx} onInput={input => onPuzzle(puzzle.id, input)} />}
      </svg>
      {children}
      {closeUp ? (
        <button type="button" className={styles.back} onClick={onBack}>
          Back
        </button>
      ) : (
        <>
          <button type="button" className={styles.arrow} data-side="left" aria-label="Turn left" onClick={() => onTurn('left')}>
            ‹
          </button>
          <button type="button" className={styles.arrow} data-side="right" aria-label="Turn right" onClick={() => onTurn('right')}>
            ›
          </button>
        </>
      )}
    </div>
  )
}
