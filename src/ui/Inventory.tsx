// The inventory strip: tap once to select an item, again to read it.
import { iconSvg } from '../art/icons.ts'
import type { AssetCtx } from '../art/kit.ts'
import styles from './Inventory.module.css'

type Props = {
  items: { id: string; name: string; icon?: string }[]
  selected: string | null
  onTap: (id: string) => void
  // The level's palette and own art, for icons the level drew.
  art: AssetCtx
}

// Empty slots keep the strip a steady size, as in the prototype.
const SLOTS = 6

export function Inventory({ items, selected, onTap, art }: Props) {
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
          <ItemIcon name={item.name} icon={item.icon} art={art} />
        </button>
      ))}
      {Array.from({ length: Math.max(0, SLOTS - items.length) }, (_, i) => (
        <span key={`empty${i}`} className={styles.slot} data-empty="" aria-hidden="true" />
      ))}
    </div>
  )
}

function ItemIcon({ name, icon, art }: { name: string; icon: string | undefined; art: AssetCtx }) {
  const svg = icon ? iconSvg(icon, art) : null
  if (!svg) return <span className={styles.glyph}>{name.slice(0, 1)}</span>
  return <span className={styles.icon} dangerouslySetInnerHTML={{ __html: svg }} />
}
