// The inventory strip: tap once to select an item, again to read it.
import { iconSvg } from '../art/icons.ts'
import styles from './Inventory.module.css'

type Props = {
  items: { id: string; name: string; icon?: string }[]
  selected: string | null
  onTap: (id: string) => void
}

// Empty slots keep the strip a steady size, as in the prototype.
const SLOTS = 6

export function Inventory({ items, selected, onTap }: Props) {
  return (
    <div className={styles.strip} role="toolbar" aria-label="Inventory">
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
      {Array.from({ length: Math.max(0, SLOTS - items.length) }, (_, i) => (
        <span key={`empty${i}`} className={styles.slot} data-empty="" aria-hidden="true" />
      ))}
    </div>
  )
}

function ItemIcon({ name, icon }: { name: string; icon: string | undefined }) {
  const svg = icon ? iconSvg(icon) : null
  if (!svg) return <span className={styles.glyph}>{name.slice(0, 1)}</span>
  return <span className={styles.icon} dangerouslySetInnerHTML={{ __html: svg }} />
}
