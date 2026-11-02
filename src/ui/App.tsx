import { useEffect, useState } from 'react'
import { dogMark } from '../art/dogMark.ts'
import { loadGame, type LoadResult } from '../engine/save.ts'
import type { Level } from '../engine/schema.ts'
import { newGame, type GameState } from '../engine/state.ts'
import { applyUpdate, registerServiceWorker } from '../pwa.ts'
import styles from './App.module.css'
import { Game } from './game/Game.tsx'
import { loadCatalog, type Entry } from './levels.ts'

const logo = dogMark()

function readSave(level: Level): LoadResult {
  try {
    return loadGame(localStorage, level)
  } catch {
    return { kind: 'none' }
  }
}

type Playing = { level: Level; state: GameState; fresh: boolean }

export function App() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [playing, setPlaying] = useState<Playing | null>(null)
  useEffect(() => registerServiceWorker(setWaiting), [])
  useEffect(() => {
    void loadCatalog().then(setEntries)
  }, [])

  let screen
  if (playing) screen = <Game level={playing.level} initial={playing.state} fresh={playing.fresh} onQuit={() => setPlaying(null)} />
  else screen = <Title entries={entries} onPlay={setPlaying} />

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

function Title({ entries, onPlay }: { entries: Entry[] | null; onPlay: (playing: Playing) => void }) {
  const real = entries?.filter(e => !e.test) ?? []
  const tests = entries?.filter(e => e.test) ?? []
  return (
    <main className={styles.shell}>
      <div className={styles.title}>
        <svg className={styles.logo} viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo }} />
        <h1>Black Dog Lane</h1>
        {entries === null ? (
          <p>Opening the doors…</p>
        ) : (
          <div className={styles.levels}>
            {real.map(e => (
              <LevelRow key={e.level.id} level={e.level} onPlay={onPlay} />
            ))}
            {tests.length > 0 && <h2>Test rooms</h2>}
            {tests.map(e => (
              <LevelRow key={e.level.id} level={e.level} onPlay={onPlay} />
            ))}
          </div>
        )}
      </div>
      <p className={styles.version}>build {__BUILD_ID__}</p>
    </main>
  )
}

function LevelRow({ level, onPlay }: { level: Level; onPlay: (playing: Playing) => void }) {
  const save = readSave(level)
  return (
    <section className={styles.level} aria-label={level.title}>
      <p>{level.title}</p>
      <div className={styles.buttons}>
        {save.kind === 'ok' && (
          <button type="button" className={styles.link} onClick={() => onPlay({ level, state: save.state, fresh: false })}>
            Continue
          </button>
        )}
        <button type="button" className={styles.link} onClick={() => onPlay({ level, state: newGame(level), fresh: true })}>
          {save.kind === 'none' ? 'Enter' : 'Start over'}
        </button>
      </div>
      {save.kind === 'mismatch' && <p className={styles.note}>Your saved game is from an older version, so it starts over.</p>}
    </section>
  )
}
