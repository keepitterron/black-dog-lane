// The hints asked for so far on the current objective, so they can be read again, and a button
// for the next one. Asking still goes through the engine's `hint` action.
import { NO_HINT } from '../../engine/text.ts'
import styles from './HintSheet.module.css'

type Props = { hints: string[]; open: boolean; onMore: () => void; onClose: () => void }

export function HintSheet({ hints, open, onMore, onClose }: Props) {
  return (
    <div className={styles.sheet} role="dialog" aria-label="Hints">
      {open ? (
        <ol className={styles.list}>
          {hints.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ol>
      ) : (
        <p className={styles.none}>{NO_HINT}</p>
      )}
      <div className={styles.row}>
        {open && hints.length < 3 && (
          <button type="button" className={styles.button} onClick={onMore}>
            {hints.length === 0 ? 'Show a hint' : 'Another hint'}
          </button>
        )}
        <button type="button" className={styles.button} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
