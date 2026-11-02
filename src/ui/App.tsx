import { useEffect, useState } from 'react'
import { dogMark } from '../art/dogMark.ts'
import { applyUpdate, registerServiceWorker } from '../pwa.ts'
import styles from './App.module.css'

const dog = dogMark()

export function App() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  useEffect(() => registerServiceWorker(setWaiting), [])

  return (
    <main className={styles.shell}>
      <div className={styles.title}>
        <svg className={styles.dog} viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dog }} />
        <h1>Black Dog Lane</h1>
        <p>The rooms are being built. The dog is waiting.</p>
      </div>
      <p className={styles.version}>build {__BUILD_ID__}</p>
      {waiting && (
        <div className={styles.toast} role="status">
          <span>Update available</span>
          <button type="button" onClick={() => applyUpdate(waiting)}>
            Update
          </button>
        </div>
      )}
    </main>
  )
}
