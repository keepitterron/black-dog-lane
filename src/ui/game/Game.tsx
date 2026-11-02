// The game screen: runs the engine, saves after every step, and plays the resulting events
// in order (lines of text, beats, sounds, chapter cards and the ending).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setMuted, isMuted, onAudioReady } from '../../audio/audio.ts'
import { playSfx, startDrone, stopDrone, type SfxId } from '../../audio/sfx.ts'
import { test } from '../../engine/conditions.ts'
import { currentViewId, type GameEvent } from '../../engine/context.ts'
import { lookup } from '../../engine/lookup.ts'
import { clearSave, saveGame } from '../../engine/save.ts'
import type { Level } from '../../engine/schema.ts'
import { newGame, type GameState } from '../../engine/state.ts'
import { step, type Action } from '../../engine/step.ts'
import { Inventory } from '../Inventory.tsx'
import { Message, type MessageItem } from '../Message.tsx'
import { useReducedMotion } from '../useReducedMotion.ts'
import styles from './Game.module.css'
import { Scene } from './Scene.tsx'

const ORDINALS = ['one', 'two', 'three']
const BEAT_PAUSE = 350
const messageMs = (text: string) => Math.max(2400, text.length * 55)

type Card =
  | { kind: 'chapter'; index: number }
  | { kind: 'ending'; text: string; secretsFound: number; secretsTotal: number }

function storage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

type Props = { level: Level; initial: GameState; fresh: boolean; onQuit: () => void }

export function Game({ level, initial, fresh, onQuit }: Props) {
  const [state, setState] = useState(initial)
  const stateRef = useRef(initial)
  const [message, setMessage] = useState<MessageItem | null>(null)
  const [card, setCard] = useState<Card | null>(fresh ? { kind: 'chapter', index: 0 } : null)
  const [muted, setMutedState] = useState(isMuted)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const reducedMotion = useReducedMotion()
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const cardPending = useRef(false)

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }, [])
  const cancelPending = useCallback(() => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }, [])

  // Plays one step's events on a little timeline: beats pause before their sting, lines of
  // text follow one another, and chapter cards and the ending wait for the text to finish.
  const direct = useCallback(
    (events: GameEvent[]) => {
      let t = 0
      let textFree = 0
      const show = (text: string) => {
        const at = Math.max(t, textFree)
        textFree = at + messageMs(text)
        later(at, () => setMessage({ id: performance.now(), text }))
      }
      for (const event of events) {
        switch (event.type) {
          case 'say':
            show(event.text)
            break
          case 'beat':
            t += BEAT_PAUSE
            break
          case 'sound': {
            const sfx: SfxId = event.sfx
            later(t, () => playSfx(sfx))
            break
          }
          case 'give':
            later(t, () => playSfx('pick'))
            break
          case 'hint':
            show(`Hint ${event.tier + 1} of 3: ${event.text}`)
            break
          case 'chapterEnd': {
            const index = (lookup(level).chapters.get(event.chapter)?.index ?? 0) + 1
            if (index < level.chapters.length) {
              cardPending.current = true
              later(Math.max(t, textFree) + 600, () => {
                cardPending.current = false
                setCard({ kind: 'chapter', index })
              })
            }
            break
          }
          case 'ending': {
            const { text, secretsFound, secretsTotal } = event
            cardPending.current = true
            later(Math.max(t, textFree) + 900, () => {
              cardPending.current = false
              playSfx('eerie')
              setCard({ kind: 'ending', text, secretsFound, secretsTotal })
            })
            break
          }
          case 'error':
            console.warn('engine', event.code, event.ids.join(','))
            break
          case 'take':
          case 'puzzleSolved':
            break
        }
      }
    },
    [later, level],
  )

  const dispatch = useCallback(
    (action: Action) => {
      if (cardPending.current) return
      const result = step(level, stateRef.current, action)
      stateRef.current = result.state
      setState(result.state)
      if (action.type !== 'arrive' && result.events.some(e => e.type === 'say' || e.type === 'hint')) cancelPending()
      direct(result.events)
    },
    [cancelPending, direct, level],
  )

  // Save after every change.
  useEffect(() => {
    const store = storage()
    if (store) saveGame(store, state)
  }, [state])

  // A new view: play the turn sound, then send `arrive` once it has faded in.
  const viewId = currentViewId(state)
  useEffect(() => {
    if (card) return
    playSfx('turn')
    const timer = setTimeout(() => {
      if (currentViewId(stateRef.current) === viewId) dispatch({ type: 'arrive' })
    }, reducedMotion ? 0 : 160)
    return () => clearTimeout(timer)
  }, [viewId, card, dispatch, reducedMotion])

  // The room drone, and looping ambient sounds whose condition holds.
  useEffect(() => {
    onAudioReady(startDrone)
    return () => {
      stopDrone()
      cancelPending()
    }
  }, [cancelPending])
  const room = lookup(level).rooms.get(state.location.room)?.room
  const ambientKey = JSON.stringify((room?.ambient ?? []).filter(a => test(a.when, state)).map(a => [a.sfx, a.everyMs]))
  useEffect(() => {
    if (ambientKey === '[]') return
    const active = (room?.ambient ?? []).filter(a => test(a.when, stateRef.current))
    const loops = active.map(a => setInterval(() => playSfx(a.sfx), a.everyMs))
    return () => loops.forEach(clearInterval)
  }, [ambientKey, room])

  const items = useMemo(
    () => state.inventory.map(id => ({ id, name: level.items[id]?.name ?? id, icon: level.items[id]?.icon ?? '' })),
    [state.inventory, level],
  )

  function restart() {
    const store = storage()
    if (store) clearSave(store, level.id)
    cancelPending()
    const restarted = newGame(level)
    stateRef.current = restarted
    setState(restarted)
    setMessage(null)
    setConfirmRestart(false)
    setCard({ kind: 'chapter', index: 0 })
  }

  return (
    <main className={styles.shell}>
      <header className={styles.hud}>
        <button type="button" className={styles.pill} onClick={onQuit} aria-label="Back to title">
          ‹
        </button>
        <span className={styles.title}>{level.title}</span>
        <div className={styles.actions}>
          <button type="button" className={styles.pill} onClick={() => dispatch({ type: 'hint' })}>
            Hint
          </button>
          <button
            type="button"
            className={styles.pill}
            aria-pressed={!muted}
            onClick={() => {
              setMuted(!muted)
              setMutedState(!muted)
            }}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <button
            type="button"
            className={styles.pill}
            onClick={() => (confirmRestart ? restart() : setConfirmRestart(true))}
            onBlur={() => setConfirmRestart(false)}
          >
            {confirmRestart ? 'Tap again' : 'Restart'}
          </button>
        </div>
      </header>

      <div className={styles.play}>
        <Scene
          level={level}
          state={state}
          onHotspot={id => dispatch({ type: 'tapHotspot', id })}
          onPuzzle={(puzzle, input) => {
            playSfx('click')
            dispatch({ type: 'puzzleInput', puzzle, input })
          }}
          onTurn={dir => dispatch({ type: 'turn', dir })}
          onBack={() => dispatch({ type: 'back' })}
        >
          <Message message={message} />
        </Scene>
        <Inventory items={items} selected={state.selected} onTap={id => dispatch({ type: 'tapItem', id })} />
      </div>

      {card && (
        <div className={styles.card} role="dialog" aria-modal="true">
          {card.kind === 'chapter' ? (
            <>
              {card.index === 0 && <h1>{level.title}</h1>}
              <h2>Chapter {ORDINALS[card.index] ?? card.index + 1}</h2>
              <p>{level.chapters[card.index]?.intro}</p>
              <button type="button" className={styles.big} onClick={() => setCard(null)}>
                {card.index === 0 ? 'Enter' : 'Continue'}
              </button>
            </>
          ) : (
            <>
              <h1>You made it out.</h1>
              <p>{card.text}</p>
              <p className={styles.small}>
                Secrets found: {card.secretsFound} of {card.secretsTotal}
              </p>
              <div className={styles.row}>
                <button type="button" className={styles.big} onClick={restart}>
                  Play again
                </button>
                <button type="button" className={styles.big} onClick={onQuit}>
                  Title
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}
