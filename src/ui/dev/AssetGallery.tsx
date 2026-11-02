// Dev-only preview of the art catalog at /dev/assets: every asset in any palette with its
// flags toggled and its slots outlined, and every puzzle widget playable through the real
// reducer. Loaded lazily from main.tsx in dev builds, so production never ships it.
import { useState } from 'react'
import { renderAsset } from '../../art/assets/index.ts'
import { iconSvg } from '../../art/icons.ts'
import { sceneDefs } from '../../art/kit.ts'
import { PALETTES, type Palette } from '../../art/palettes.ts'
import { ASSET_IDS, CATALOG, PALETTE_IDS, placedRect, SLOT_BOX, type AssetId, type PaletteId, type Params, type Slot } from '../../catalog/assets.ts'
import { newGame } from '../../engine/state.ts'
import { step, type Action } from '../../engine/step.ts'
import { Scene } from '../game/Scene.tsx'
import { DEMO_PUZZLES, demoLevel } from './demoLevel.ts'
import styles from './AssetGallery.module.css'

const KINDS = [
  ['shell', 'Shells'],
  ['wall', 'Furniture and wall pieces'],
  ['prop', 'Props'],
  ['closeUp', 'Close-ups'],
] as const

export function AssetGallery() {
  const [paletteId, setPaletteId] = useState<PaletteId>('waiting')
  const pal = PALETTES[paletteId]
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Assets</h1>
        <label>
          Palette{' '}
          <select value={paletteId} onChange={e => setPaletteId(PALETTE_IDS.find(id => id === e.target.value) ?? 'waiting')}>
            {PALETTE_IDS.map(id => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <a href="#widgets">Widgets</a>
      </header>
      {KINDS.map(([kind, title]) => (
        <section key={kind}>
          <h2>{title}</h2>
          <div className={styles.grid}>
            {ASSET_IDS.filter(id => CATALOG[id].kind === kind).map(id => (
              <AssetCard key={id} id={id} pal={pal} />
            ))}
          </div>
        </section>
      ))}
      <section id="widgets">
        <h2>Widgets</h2>
        <Widgets paletteId={paletteId} />
      </section>
    </main>
  )
}

function AssetCard({ id, pal }: { id: AssetId; pal: Palette }) {
  const meta = CATALOG[id]
  const flags = Object.entries(meta.params).filter(([, spec]) => spec.type === 'flag').map(([key]) => key)
  const slots: readonly Slot[] = 'slots' in meta ? meta.slots : []
  const [on, setOn] = useState<Record<string, boolean>>({})
  const [slot, setSlot] = useState<Slot | ''>('')

  // Each flag param names a flag after itself; puzzle params point at the demo clock.
  const params: Params = Object.fromEntries(flags.map(key => [key, key]))
  if ('puzzle' in meta.params) params['puzzle'] = 'clock'
  if (slot) params['slot'] = slot
  const ctx = { flags: on, pal }
  const backdrop = meta.kind === 'wall' || meta.kind === 'prop' ? renderAsset('roomShell', {}, ctx) : ''
  const rect = placedRect(id, params)
  const box = slot ? SLOT_BOX[slot] : null
  const svg = sceneDefs(pal) + backdrop + renderAsset(id, params, ctx)
  const icon = meta.kind === 'prop' ? iconSvg(id) : null

  return (
    <figure className={styles.card}>
      <svg viewBox="0 0 800 600" className={styles.scene}>
        <g dangerouslySetInnerHTML={{ __html: svg }} />
        {box && <rect x={box.cx - box.w / 2} y={0} width={box.w} height={600} className={styles.slot} />}
        {rect && <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} className={styles.bbox} />}
      </svg>
      <figcaption>
        <strong>{id}</strong>
        {icon && <span className={styles.icon} dangerouslySetInnerHTML={{ __html: icon }} />}
        <span className={styles.describe}>{meta.describe}</span>
        <span className={styles.controls}>
          {flags.map(flag => (
            <label key={flag}>
              <input type="checkbox" checked={on[flag] ?? false} onChange={e => setOn({ ...on, [flag]: e.target.checked })} /> {flag}
            </label>
          ))}
          {slots.length > 0 && (
            <select value={slot} onChange={e => setSlot(slots.find(s => s === e.target.value) ?? '')} aria-label="Slot">
              <option value="">as drawn</option>
              {slots.map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </span>
      </figcaption>
    </figure>
  )
}

const CLOSE_UPS = DEMO_PUZZLES.filter(p => p.kind !== 'trail').map(p => p.id)

function Widgets({ paletteId }: { paletteId: PaletteId }) {
  const level = demoLevel(paletteId)
  const [state, setState] = useState(() => newGame(level))
  const [said, setSaid] = useState('')
  const dispatch = (action: Action) => {
    const result = step(level, state, action)
    setState(result.state)
    const text = result.events.flatMap(e => (e.type === 'say' ? [e.text] : [])).join(' ')
    if (text) setSaid(text)
  }
  return (
    <div className={styles.widgets}>
      <div className={styles.controls}>
        {CLOSE_UPS.map(view => (
          <button key={view} type="button" onClick={() => dispatch({ type: 'open', view })}>
            {view}
          </button>
        ))}
        <button type="button" onClick={() => dispatch({ type: 'back' })}>
          trail (walls)
        </button>
        <button
          type="button"
          onClick={() => {
            setState(newGame(level))
            setSaid('')
          }}
        >
          reset
        </button>
        <output>{said}</output>
      </div>
      <Scene
        level={level}
        state={state}
        onHotspot={id => dispatch({ type: 'tapHotspot', id })}
        onPuzzle={(puzzle, input) => dispatch({ type: 'puzzleInput', puzzle, input })}
        onTurn={dir => dispatch({ type: 'turn', dir })}
        onBack={() => dispatch({ type: 'back' })}
      />
    </div>
  )
}
