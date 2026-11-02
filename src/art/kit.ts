// Shared drawing helpers and the asset contract. An asset is a pure function from its params
// and the current flags to an SVG fragment in the 800×600 scene.
import { SYMBOLS } from '../catalog/assets.ts'
import type { GameState } from '../engine/state.ts'
import type { Palette } from './palettes.ts'

export { SYMBOLS }
export type Params = Record<string, number | string>
// `pal` is the level's palette: room colours come from it, never from literals.
export type AssetCtx = { flags: GameState['flags']; pal: Palette }
export type Asset = (p: Params, ctx: AssetCtx) => string

export const FONT = 'IM Fell English, Georgia, serif'
// Fixed colours for things that carry meaning in every palette.
export const INK = '#2a1c13'
export const PAPER = '#d8ccb2'
export const BRASS = '#c9a35a'

export const num = (p: Params, key: string, fallback: number): number => {
  const v = p[key]
  return typeof v === 'number' ? v : fallback
}
export const str = (p: Params, key: string, fallback: string): string => {
  const v = p[key]
  return typeof v === 'string' ? v : fallback
}
// Params ending in `Flag` name a flag; the asset changes look when it is set.
export const on = (p: Params, key: string, ctx: AssetCtx): boolean => {
  const flag = p[key]
  return typeof flag === 'string' && Boolean(ctx.flags[flag])
}

export function hand(cx: number, cy: number, len: number, deg: number, w: number, col: string): string {
  const r = (deg * Math.PI) / 180
  return `<line x1="${cx}" y1="${cy}" x2="${(cx + len * Math.sin(r)).toFixed(1)}" y2="${(cy - len * Math.cos(r)).toFixed(1)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`
}

export function hands(cx: number, cy: number, hl: number, ml: number, hw: number, mw: number, col: string, h: number, m: number): string {
  return hand(cx, cy, hl, ((h % 12) + m / 60) * 30, hw, col) + hand(cx, cy, ml, m * 6, mw, col)
}

// Reads a clock puzzle's time from flags, falling back to its starting time.
export function clockTimeFrom(p: Params, ctx: AssetCtx): { h: number; m: number } {
  const id = str(p, 'puzzle', '')
  const h = ctx.flags[`${id}:h`]
  const m = ctx.flags[`${id}:m`]
  return { h: typeof h === 'number' ? h : num(p, 'h', 3), m: typeof m === 'number' ? m : num(p, 'm', 45) }
}

export function sym(n: string, x: number, y: number, s: number, col: string, mir = false, w = 3): string {
  const sw = (w / s).toFixed(3)
  const st = `fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`
  let d = ''
  if (n === 'moon') d = `<path d="M0.2,-0.98 A1,1 0 1,0 0.2,0.98 A1.01,1.01 0 0,1 0.2,-0.98Z" fill="${col}"/>`
  if (n === 'eye') d = `<path d="M-1,0 Q0,-0.78 1,0 Q0,0.78 -1,0Z" ${st}/><circle r="0.3" fill="${col}"/>`
  if (n === 'key') d = `<circle cx="-0.55" cy="0" r="0.35" ${st}/><path d="M-0.2,0 H1 M0.62,0 V0.36 M0.9,0 V0.3" ${st}/>`
  if (n === 'bird') d = `<path d="M-1,-0.15 Q-0.55,-0.75 -0.05,0.1 Q0.35,-0.55 0.95,-0.35" ${st}/>`
  if (n === 'sun') {
    d = `<circle r="0.38" ${st}/>`
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      d += `<line x1="${(0.6 * Math.cos(a)).toFixed(2)}" y1="${(0.6 * Math.sin(a)).toFixed(2)}" x2="${(0.95 * Math.cos(a)).toFixed(2)}" y2="${(0.95 * Math.sin(a)).toFixed(2)}" ${st}/>`
    }
  }
  if (n === 'star') {
    const pts: string[] = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.42 : 1
      const a = ((-90 + i * 36) * Math.PI) / 180
      pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`)
    }
    d = `<polygon points="${pts.join(' ')}" ${st}/>`
  }
  if (n === 'hand') d = `<path d="M-0.5,0.9 V-0.2 M-0.5,0 V-0.8 M-0.15,0 V-0.95 M0.2,0 V-0.85 M0.55,0.1 V-0.6 M-0.5,0.9 H0.55 V0.1 M-0.5,-0.1 L-0.95,-0.45" ${st}/>`
  if (n === 'fish') d = `<path d="M-0.9,0 Q-0.2,-0.6 0.5,0 Q-0.2,0.6 -0.9,0Z M0.5,0 L0.95,-0.4 V0.4Z" ${st}/>`
  if (n === 'tree') d = `<path d="M0,0.95 V0.2 M-0.7,0.2 L0,-0.95 L0.7,0.2Z" ${st}/>`
  if (n === 'crown') d = `<path d="M-0.9,0.5 L-0.9,-0.5 L-0.45,0 L0,-0.7 L0.45,0 L0.9,-0.5 L0.9,0.5Z" ${st}/>`
  if (n === 'paw') d = `<ellipse cx="0" cy="0.35" rx="0.42" ry="0.36" fill="${col}"/><circle cx="-0.55" cy="-0.15" r="0.18" fill="${col}"/><circle cx="-0.2" cy="-0.5" r="0.18" fill="${col}"/><circle cx="0.2" cy="-0.5" r="0.18" fill="${col}"/><circle cx="0.55" cy="-0.15" r="0.18" fill="${col}"/>`
  if (n === 'bone') d = `<path d="M-0.6,-0.12 H0.6 M-0.6,0.12 H0.6" ${st}/><circle cx="-0.75" cy="-0.2" r="0.2" ${st}/><circle cx="-0.75" cy="0.2" r="0.2" ${st}/><circle cx="0.75" cy="-0.2" r="0.2" ${st}/><circle cx="0.75" cy="0.2" r="0.2" ${st}/>`
  return `<g transform="translate(${x} ${y}) scale(${mir ? -s : s} ${s})">${d}</g>`
}

export function cuttersArt(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 -16 L6 8 M14 -16 L-6 8" stroke="#9aa0a0" stroke-width="3.2" stroke-linecap="round"/><circle cx="-9" cy="13" r="6" fill="none" stroke="#6e2a2a" stroke-width="3.2"/><circle cx="9" cy="13" r="6" fill="none" stroke="#6e2a2a" stroke-width="3.2"/></g>`
}

export function birdKey(x: number, y: number, s: number, col: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-2 0 H22 M16 0 V6 M20 0 V5" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-20 2 Q-14 -12 -6 -4 Q-2 -10 2 -8 Q-2 6 -10 6 Q-18 6 -20 2Z" fill="${col}"/></g>`
}

// Patterns and gradients every scene can reference by id. `wp` is the default wallpaper;
// `wp-<motif>` the others `roomShell` can pick.
export function sceneDefs(c: Palette): string {
  const paper = (id: string, motif: string) =>
    `<pattern id="${id}" width="40" height="56" patternUnits="userSpaceOnUse"><rect width="40" height="56" fill="${c.wall}"/>${motif}</pattern>`
  return `<defs>
${paper('wp', `<rect width="2" height="56" fill="${c.wallDark}"/><path d="M20 10 l6 9 -6 9 -6 -9z" fill="none" stroke="${c.wallMotif}" stroke-width="1.2"/><circle cx="20" cy="42" r="1.6" fill="${c.wallMotif}"/>`)}
${paper('wp-stripe', `<rect width="12" height="56" fill="${c.wallDark}"/><rect x="18" width="2" height="56" fill="${c.wallMotif}"/>`)}
${paper('wp-damask', `<path d="M20 6 q10 10 0 22 q-10 -12 0 -22z M20 34 q8 8 0 16 q-8 -8 0 -16z" fill="${c.wallDark}" stroke="${c.wallMotif}" stroke-width="1"/>`)}
${paper('wp-plain', `<rect y="54" width="40" height="2" fill="${c.wallDark}" opacity=".5"/>`)}
<pattern id="planks" width="120" height="26" patternUnits="userSpaceOnUse"><rect width="120" height="26" fill="${c.floor}"/><rect y="24" width="120" height="2" fill="${c.floorSeam}"/><rect x="80" width="2" height="24" fill="${c.floorSeam}"/></pattern>
<radialGradient id="dark" cx="400" cy="290" r="540" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.dark}" stop-opacity=".38"/><stop offset="1" stop-color="${c.dark}" stop-opacity=".92"/></radialGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2630"/><stop offset="1" stop-color="#0d1217"/></linearGradient>
<linearGradient id="beyond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070605"/><stop offset="1" stop-color="#46535b"/></linearGradient>
<radialGradient id="flame" cx=".5" cy=".68" r=".6"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#f2b54f"/><stop offset="1" stop-color="#c0571f" stop-opacity="0"/></radialGradient>
</defs>`
}
