import { useEffect, useState, useSyncExternalStore } from 'react'
import waitingRoomJson from '../../levels/test/waiting-room.json'
import { DOG } from '../engine/dog.ts'
import { loadGame, type LoadResult } from '../engine/save.ts'
import { parseLevel } from '../engine/schema.ts'
import { newGame, type GameState } from '../engine/state.ts'
import { applyUpdate, registerServiceWorker } from '../pwa.ts'
import styles from './App.module.css'
import { Dog } from './dog/Dog.tsx'
import { DogLab } from './DogLab.tsx'
import { Game } from './game/Game.tsx'

const parsed = parseLevel(waitingRoomJson)
if (!parsed.ok) throw new Error('levels/test/waiting-room.json is invalid')
const level = parsed.level

const subscribeHash = (notify: () => void) => {
  addEventListener('hashchange', notify)
  return () => removeEventListener('hashchange', notify)
}

function readSave(): LoadResult {
  try {
    return loadGame(localStorage, level)
  } catch {
    return { kind: 'none' }
  }
}

export function App() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [playing, setPlaying] = useState<{ state: GameState; fresh: boolean } | null>(null)
  const hash = useSyncExternalStore(subscribeHash, () => location.hash)
  useEffect(() => registerServiceWorker(setWaiting), [])

  let screen
  if (hash === '#dog') screen = <DogLab />
  else if (playing) screen = <Game level={level} initial={playing.state} fresh={playing.fresh} onQuit={() => setPlaying(null)} />
  else screen = <Title onPlay={(state, fresh) => setPlaying({ state, fresh })} />

  return (
    <>
      {screen}
      {waiting && (
        <div className={styles.toast} role="status">
          <span>Update available</span>
          <button type="button" onClick={() => applyUpdate(waiting)}>
            Update
          </button>
        </div>
      )}
    </>
  )
}

function Title({ onPlay }: { onPlay: (state: GameState, fresh: boolean) => void }) {
  const save = readSave()
  return (
    <main className={styles.shell}>
      <div className={styles.title}>
        <Dog className={styles.dog} pose="wag" />
        <h1>Black Dog Lane</h1>
        <p>{level.title}</p>
        <div className={styles.buttons}>
          {save.kind === 'ok' && (
            <button type="button" className={styles.link} onClick={() => onPlay(save.state, false)}>
              Continue
            </button>
          )}
          <button type="button" className={styles.link} onClick={() => onPlay(newGame(level), true)}>
            {save.kind === 'none' ? 'Enter' : 'Start over'}
          </button>
        </div>
        {save.kind === 'mismatch' && <p className={styles.note}>Your saved game is from an older version, so it starts over.</p>}
        <a className={styles.quiet} href="#dog">
          Meet {DOG.name}
        </a>
      </div>
      <p className={styles.version}>build {__BUILD_ID__}</p>
    </main>
  )
}
