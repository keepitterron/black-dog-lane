// Inventory icons, in a 60×60 box centred on the origin. Item `icon` fields name one of
// these or a prop (props are drawn in the same box).
import { PROP_IDS, type AssetId } from '../catalog/assets.ts'
import { ASSETS } from './assets/index.ts'
import { birdKey, cuttersArt, sym } from './kit.ts'
import { PALETTES } from './palettes.ts'

const ITEM_ONLY: Record<string, string> = {
  ironKey: sym('key', 0, 0, 22, '#8a8f8a', false, 3.5),
  brassKey: sym('key', 0, 0, 25, '#c9a35a', false, 5),
  birdKey: birdKey(-2, 0, 1.15, '#c9a35a'),
  cutters: cuttersArt(0, -2, 1.15),
  match: `<line x1="-18" y1="18" x2="13" y2="-13" stroke="#c9b48a" stroke-width="4" stroke-linecap="round"/><circle cx="15" cy="-15" r="4.5" fill="#7a2a20"/>`,
  litMatch: `<line x1="-18" y1="18" x2="13" y2="-13" stroke="#c9b48a" stroke-width="4" stroke-linecap="round"/><circle cx="15" cy="-15" r="4.5" fill="#7a2a20"/><ellipse cx="17" cy="-22" rx="6" ry="10" fill="#f2b54f" opacity=".9"/><ellipse cx="17" cy="-20" rx="3" ry="5" fill="#fff3c4"/>`,
  glassEye: `<circle r="17" fill="#e8e2d4"/><circle r="8.5" fill="#6f7e6a"/><circle r="3.8" fill="#120c09"/><circle cx="-5" cy="-6" r="2.5" fill="#fff"/>`,
}

export const ICONS: Record<string, string> = {
  ...ITEM_ONLY,
  ...Object.fromEntries(PROP_IDS.map((id: AssetId) => [id, ASSETS[id]({}, { flags: {}, pal: PALETTES.waiting })])),
}

export function iconSvg(icon: string): string | null {
  const inner = Object.hasOwn(ICONS, icon) ? ICONS[icon] : undefined
  return inner ? `<svg viewBox="-30 -30 60 60" aria-hidden="true">${inner}</svg>` : null
}
