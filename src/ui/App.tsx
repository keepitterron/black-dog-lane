import { useEffect, useState, useSyncExternalStore } from 'react'
import { applyUpdate, registerServiceWorker } from '../pwa.ts'
import styles from './App.module.css'
import { Dog } from './dog/Dog.tsx'
import { DogLab } from './DogLab.tsx'

const subscribeHash = (notify: () => void) => {
  addEventListener('hashchange', notify)
  return () => removeEventListener('hashchange', notify)
}

export function App() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const hash = useSyncExternalStore(subscribeHash, () => location.hash)
  useEffect(() => registerServiceWorker(setWaiting), [])

  return (
    <>
      {hash === '#dog' ? <DogLab /> : <Title />}
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

function Title() {
  return (
    <main className={styles.shell}>
      <div className={styles.title}>
        <Dog className={styles.dog} pose="wag" />
        <h1>Black Dog Lane</h1>
        <p>The rooms are being built. The dog is waiting.</p>
        <a className={styles.link} href="#dog">
          Meet the dog
        </a>
      </div>
      <p className={styles.version}>build {__BUILD_ID__}</p>
    </main>
  )
}
