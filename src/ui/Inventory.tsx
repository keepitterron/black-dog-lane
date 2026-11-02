// The inventory strip. The dog is a permanent first slot: select it, then tap something to
// send the dog there.
import { dogHeadSvgInner } from '../art/dog.ts'
import { iconSvg } from '../art/icons.ts'
import { DOG, DOG_SLOT } from '../engine/dog.ts'
import styles from './Inventory.module.css'

const dogHead = dogHeadSvgInner()

type Props = {
  items: { id: string; name: string; icon?: string }[]
  selected: string | null
  onTap: (id: string) => void
  // Briefly highlights the dog slot, e.g. while the dog is giving a hint.
  dogBusy?: boolean
}

export function Inventory({ items, selected, onTap, dogBusy = false }: Props) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Inventory">
      <button
        type="button"
        className={styles.slot}
        data-dog=""
        aria-pressed={selected === DOG_SLOT}
        data-busy={dogBusy || undefined}
        aria-label={DOG.name}
        onClick={() => onTap(DOG_SLOT)}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: dogHead }} />
      </button>
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={styles.slot}
          aria-pressed={selected === item.id}
          aria-label={item.name}
          onClick={() => onTap(item.id)}
        >
          <ItemIcon name={item.name} icon={item.icon} />
        </button>
      ))}
    </div>
  )
}

function ItemIcon({ name, icon }: { name: string; icon: string | undefined }) {
  const svg = icon ? iconSvg(icon) : null
  if (!svg) return <span className={styles.glyph}>{name.slice(0, 1)}</span>
  return <span className={styles.icon} dangerouslySetInnerHTML={{ __html: svg }} />
}
