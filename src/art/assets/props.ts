// Small objects drawn in the 60×60 box around the origin, so the same drawing works placed
// in a scene, laid out in a container close-up and as an inventory icon. Every prop is gone
// once its `goneFlag` is set.
import { BRASS, on, PAPER, str, sym, type Asset, type AssetCtx, type Params } from '../kit.ts'

type Draw = (p: Params, ctx: AssetCtx) => string

const prop =
  (draw: Draw): Asset =>
  (p, ctx) =>
    on(p, 'goneFlag', ctx) ? '' : draw(p, ctx)

export const candleStub = prop(
  (p, ctx) =>
    `<ellipse cx="0" cy="26" rx="22" ry="5" fill="#8c6a35"/><rect x="-7" y="-4" width="14" height="30" fill="${PAPER}"/><line x1="0" y1="-4" x2="0" y2="-10" stroke="#1a120c" stroke-width="2"/>` +
    (on(p, 'litFlag', ctx) ? `<g class="flicker"><circle cx="0" cy="-18" r="26" fill="${ctx.pal.light}" opacity=".15"/><ellipse cx="0" cy="-20" rx="5" ry="10" fill="url(#flame)"/></g>` : ''),
)

export const photograph = prop(
  () =>
    `<rect x="-22" y="-28" width="44" height="56" fill="#7a5b33"/><rect x="-17" y="-23" width="34" height="40" fill="#8a7a5a"/><circle cx="0" cy="-10" r="6" fill="#2a2014"/><path d="M-9 17 L-7 -2 L7 -2 L9 17Z" fill="#2a2014"/><rect x="-17" y="19" width="34" height="5" fill="#cfc3aa"/>`,
)

export const paperNote = prop(
  () => `<path d="M-24 -18 L22 -22 L26 18 L-20 22Z" fill="#cfc3aa"/><path d="M-14 -8 L14 -10 M-14 0 L16 -2 M-14 8 L6 7" stroke="#8b7f69" stroke-width="2"/><path d="M-4 -20 L-2 20" stroke="#b3a68c" stroke-width="1"/>`,
)

export const matchbox = prop(
  () => `<rect x="-22" y="-14" width="44" height="28" rx="3" fill="#6e2a2a"/><rect x="-14" y="-8" width="28" height="14" fill="#cfc3aa"/><rect x="-22" y="10" width="44" height="4" fill="#3a2a20"/>`,
)

export const keyRing = prop(
  () =>
    `<circle cx="-6" cy="-12" r="12" fill="none" stroke="#9aa0a0" stroke-width="3"/>${sym('key', 4, 6, 16, BRASS, false, 3)}<g transform="rotate(50 -6 0)">${sym('key', 0, 8, 13, '#8a8f8a', false, 3)}</g>`,
)

export const musicBox = prop((p, ctx) => {
  const base = `<rect x="-26" y="-4" width="52" height="28" rx="2" fill="#6b3a2a"/><rect x="-26" y="2" width="52" height="3" fill="${BRASS}"/><rect x="26" y="6" width="5" height="4" fill="${BRASS}"/>`
  return on(p, 'openFlag', ctx)
    ? `${base}<path d="M-26 -4 L-22 -30 L30 -30 L26 -4Z" fill="#5a2e22"/><rect x="-24" y="-6" width="48" height="4" fill="#3a1a12"/><path d="M0 -6 V-20 M-5 -16 L5 -16 M0 -20 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" stroke="#e6dccb" stroke-width="2" fill="none"/>`
    : `${base}<rect x="-27" y="-12" width="54" height="9" rx="2" fill="#5a2e22"/>`
})

export const jar = prop((p, ctx) => {
  let s = `<rect x="-13" y="-30" width="26" height="7" rx="2" fill="#6b6b62"/><path d="M-18 -22 Q-20 -24 -14 -24 L14 -24 Q20 -24 18 -22 L20 24 Q20 28 14 28 L-14 28 Q-20 28 -20 24Z" fill="#9fb0b8" opacity=".35" stroke="#c9d3d8" stroke-width="1.5"/>`
  if (on(p, 'fullFlag', ctx)) s += `<path d="M-18 0 L18 0 L19 24 Q19 27 14 27 L-14 27 Q-19 27 -19 24Z" fill="#1a120c" opacity=".85"/>`
  const symbol = str(p, 'symbol', '')
  if (symbol) s += sym(symbol, 0, 4, 10, '#e6dccb', false, 2.5)
  return s + `<path d="M-12 -18 Q-14 4 -12 20" stroke="#fff" stroke-width="2" opacity=".25" fill="none"/>`
})

export const doll = prop((p, ctx) => {
  const turned = on(p, 'turnedFlag', ctx)
  const eyes = turned ? `<circle cx="-2" cy="-16" r="1.8" fill="#120c09"/><circle cx="6" cy="-16" r="1.8" fill="#120c09"/>` : `<circle cx="-4" cy="-16" r="1.8" fill="#120c09"/><circle cx="4" cy="-16" r="1.8" fill="#120c09"/>`
  return `<path d="M-14 28 L-10 -2 L10 -2 L14 28Z" fill="#7a4a5a"/><path d="M-10 0 L-18 16 M10 0 L18 16" stroke="#e6dccb" stroke-width="4" stroke-linecap="round"/><g transform="rotate(${turned ? 14 : 0} 0 -4)"><circle cx="0" cy="-15" r="11" fill="#e6dccb"/><path d="M-11 -18 Q-12 -30 0 -28 Q12 -30 11 -18 Q6 -24 0 -24 Q-6 -24 -11 -18Z" fill="#5a3a22"/>${eyes}<path d="M-2 -9 q2 1 4 0" stroke="#a4505a" stroke-width="1.5" fill="none"/></g>`
})

export const mask = prop(
  () =>
    `<path d="M-22 -22 Q0 -30 22 -22 Q26 6 0 28 Q-26 6 -22 -22Z" fill="#e6dccb" stroke="#b3a68c" stroke-width="1.5"/><path d="M-14 -8 q6 -6 12 0 q-6 4 -12 0Z M2 -8 q6 -6 12 0 q-6 4 -12 0Z" fill="#120c09"/><path d="M-6 12 Q0 8 6 12" stroke="#120c09" stroke-width="2" fill="none"/>`,
)

export const toy = prop(
  () =>
    `<rect x="-8" y="-28" width="16" height="12" fill="#2f3640"/><circle cx="0" cy="-12" r="7" fill="#e6dccb"/><rect x="-10" y="-5" width="20" height="18" fill="#7a2a2a"/><rect x="-10" y="-1" width="20" height="2" fill="${BRASS}"/><rect x="-9" y="13" width="7" height="15" fill="#2f3640"/><rect x="2" y="13" width="7" height="15" fill="#2f3640"/><rect x="10" y="-2" width="8" height="3" fill="${BRASS}"/><path d="M18 -6 q6 -6 8 0 q-2 6 -8 0" fill="${BRASS}"/>`,
)

export const ball = prop(() => `<circle cx="0" cy="8" r="20" fill="#7a2a2a"/><path d="M-20 8 Q0 -2 20 8" stroke="#d8ccb2" stroke-width="4" fill="none"/><circle cx="-7" cy="-2" r="4" fill="#fff" opacity=".25"/>`)

export const bell = prop(
  () => `<rect x="-3" y="-30" width="6" height="16" fill="#3b281c"/><path d="M-18 16 Q-18 -16 0 -16 Q18 -16 18 16 L22 22 L-22 22Z" fill="${BRASS}"/><circle cx="0" cy="26" r="4" fill="#8c6a35"/><path d="M-10 8 Q-10 -6 -2 -10" stroke="#fff3c4" stroke-width="2" opacity=".35" fill="none"/>`,
)
