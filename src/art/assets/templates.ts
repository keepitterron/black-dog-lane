// Close-up templates: param-driven views any level can fill in. Each fills the 800×600 scene;
// puzzle widgets draw their controls on top of `panelClose`.
import { FONT, on, str, sym, type Asset, type Params } from '../kit.ts'
import { inscription, windKey } from './furniture.ts'
import * as props from './props.ts'

const PROPS: Partial<Record<string, Asset>> = { ...props }

const symbols = (p: Params, key: string) => str(p, key, '').split(',').filter(Boolean)

const line = (text: string, x: number, y: number, size = 22, col = '#4a3c2e') =>
  text ? `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="${size}" fill="${col}">${text}</text>` : ''

// An open book. Each page shows a line of text and/or a symbol; `reversedFlag` mirrors the
// writing on both pages (read it in a mirror).
export const bookSpreadClose: Asset = (p, ctx) => {
  const flip = on(p, 'reversedFlag', ctx)
  const page = (cx: number, side: 'left' | 'right') => {
    const symbol = str(p, `${side}Symbol`, '')
    const content = (symbol ? sym(symbol, cx, 250, 60, '#3a2a20', false, 5) : '') + line(str(p, `${side}Text`, ''), cx, symbol ? 400 : 300)
    return flip ? `<g transform="translate(${cx * 2} 0) scale(-1 1)">${content}</g>` : content
  }
  return `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="120" y="110" width="280" height="380" fill="#d8ccb2"/><rect x="400" y="110" width="280" height="380" fill="#cfc1a3"/><line x1="400" y1="110" x2="400" y2="490" stroke="#9c8e74" stroke-width="3"/>${page(260, 'left')}${page(540, 'right')}`
}

const CONTAINER_AT: [number, number][] = [
  [250, 330],
  [400, 350],
  [550, 330],
]

// Inside something: a drawer, a box, a cabinet shelf or a table top, holding up to three
// props (`prop1`…`prop3`, each gone once its `propNGoneFlag` is set).
export const containerClose: Asset = (p, ctx) => {
  const { wood, woodDark, woodLight, woodMid } = ctx.pal
  const style = str(p, 'style', 'drawer')
  let s =
    style === 'table'
      ? `<rect width="800" height="600" fill="${woodMid}"/><ellipse cx="400" cy="330" rx="360" ry="220" fill="${woodLight}"/><ellipse cx="400" cy="330" rx="340" ry="204" fill="none" stroke="${wood}" stroke-width="3"/>`
      : style === 'shelf'
        ? `<rect width="800" height="600" fill="#120c09"/><rect x="40" y="60" width="720" height="440" fill="#1e140e" stroke="${wood}" stroke-width="20"/><rect x="40" y="400" width="720" height="22" fill="${woodLight}"/>`
        : style === 'box'
          ? `<rect width="800" height="600" fill="${woodDark}"/><rect x="130" y="130" width="540" height="360" fill="#3a1a12" stroke="#6b3a2a" stroke-width="22"/><rect x="152" y="152" width="496" height="316" fill="#5a2e22"/>`
          : `<rect width="800" height="600" fill="${woodMid}"/><rect x="110" y="110" width="580" height="400" fill="#1e140e" stroke="${woodLight}" stroke-width="20"/>`
  for (const [i, [x, y]] of CONTAINER_AT.entries()) {
    const id = str(p, `prop${i + 1}`, '')
    const draw = Object.hasOwn(PROPS, id) ? PROPS[id] : undefined
    if (!draw || on(p, `prop${i + 1}GoneFlag`, ctx)) continue
    s += `<g transform="translate(${x} ${y}) scale(2.4)">${draw({}, ctx)}</g>`
  }
  return s
}

// Glass up close. Once `fogFlag` is set, the fog shows up to four symbols, mirrored when
// `mirrored` is 1 (drawn from the other side).
export const fogGlassClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="80" y="40" width="640" height="480" fill="url(#glass)"/>`
  if (on(p, 'fogFlag', ctx)) {
    s += `<rect x="80" y="40" width="640" height="480" fill="#c9d3d8" opacity=".12"/>`
    const list = symbols(p, 'symbols').slice(0, 4)
    const gap = 640 / (list.length + 1)
    list.forEach((name, i) => {
      const x = 80 + gap * (i + 1)
      s += `<ellipse cx="${x}" cy="270" rx="60" ry="54" fill="#c9d3d8" opacity=".14"/>${sym(name, x, 270, 34, 'rgba(230,237,240,.6)', p['mirrored'] === 1, 4)}<line x1="${x - 16}" y1="318" x2="${x - 16}" y2="356" stroke="#c9d3d8" stroke-width="2" opacity=".2"/>`
    })
  }
  return s + `<rect x="80" y="40" width="640" height="480" fill="none" stroke="${ctx.pal.wood}" stroke-width="12"/>`
}

// A paper note: up to three short lines, then a row of up to five symbols. `torn` 1 tears off
// the bottom corner.
export const noteClose: Asset = (p, ctx) => {
  const paper = p['torn'] === 1 ? 'M180 70 L620 60 L630 470 L470 520 L440 480 L400 530 L190 530Z' : 'M180 70 L620 60 L630 530 L190 530Z'
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodMid}"/><path d="${paper}" fill="#cfc3aa"/><path d="M404 66 L410 528" stroke="#b3a68c" stroke-width="1.5"/>`
  ;['line1', 'line2', 'line3'].forEach((key, i) => (s += line(str(p, key, ''), 405, 170 + i * 60, 28)))
  const list = symbols(p, 'symbols').slice(0, 5)
  list.forEach((name, i) => (s += sym(name, 405 + (i - (list.length - 1) / 2) * 80, 420, 26, '#3a2a20', false, 4)))
  return s
}

// The mirror up close: the dark room behind you, maybe a figure, fog with a symbol.
export const mirrorClose: Asset = (p, ctx) => {
  // Everything seen in the glass is clipped to it.
  let s = `<clipPath id="mirror-glass"><ellipse cx="400" cy="300" rx="206" ry="256"/></clipPath><rect width="800" height="600" fill="${ctx.pal.wall}"/><ellipse cx="400" cy="300" rx="230" ry="280" fill="#b08a4a"/><g clip-path="url(#mirror-glass)"><rect width="800" height="600" fill="url(#glass)"/><rect x="230" y="440" width="340" height="110" fill="#0d1217" opacity=".6"/><rect x="260" y="160" width="90" height="160" fill="#0d1217" opacity=".5"/>`
  if (on(p, 'figureFlag', ctx))
    s += `<path d="M450 520 L450 330 Q450 290 482 280 Q464 262 466 236 Q470 206 500 206 Q530 206 534 236 Q536 262 518 280 Q550 290 550 330 L550 520Z" fill="#050403" opacity=".8"/>`
  if (on(p, 'fogFlag', ctx)) {
    s += `<ellipse cx="400" cy="300" rx="196" ry="244" fill="#c9d3d8" opacity=".2"/>`
    const symbol = str(p, 'symbol', '')
    if (symbol) s += sym(symbol, 400, 280, 70, 'rgba(230,237,240,.55)', true, 6)
  }
  return s + `<path d="M270 120 Q300 80 350 64" stroke="#c9d3d8" stroke-width="5" opacity=".2" fill="none"/></g>`
}

const PANEL_FILL = { wood: ['#4a3326', '#2a1c13'], brass: ['#8c6a35', '#5a4220'], paper: ['#cfc3aa', '#8b7f69'] } as const

// A plain backing panel for sequence, slider and pattern widgets, with an inscription.
export const panelClose: Asset = (p, ctx) => {
  const style = str(p, 'style', 'wood')
  const [fill, edge] = PANEL_FILL[style === 'brass' || style === 'paper' ? style : 'wood']
  return `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="70" y="40" width="660" height="520" rx="16" fill="${fill}" stroke="${edge}" stroke-width="8"/>${inscription(str(p, 'inscription', ''), 540, style === 'paper' ? '#4a3c2e' : '#d8ccb2')}`
}

// The music box up close. `openFlag` lifts the lid on a tiny dancer, who turns while
// `playingFlag` is set; `symbol` is painted inside the lid.
export const musicBoxClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodMid}"/><rect x="200" y="300" width="400" height="200" rx="8" fill="#6b3a2a"/><rect x="200" y="340" width="400" height="12" fill="#c9a35a"/>${windKey(600, 420, 3)}`
  if (!on(p, 'openFlag', ctx)) return s + `<rect x="192" y="244" width="416" height="64" rx="8" fill="#5a2e22"/><rect x="380" y="270" width="40" height="14" rx="3" fill="#c9a35a"/>`
  const symbol = str(p, 'symbol', '')
  s += `<path d="M200 300 L230 90 L630 90 L600 300Z" fill="#5a2e22"/><path d="M226 280 L250 112 L610 112 L586 280Z" fill="#7a2a3a"/>${symbol ? sym(symbol, 418, 196, 40, '#c9a35a', false, 4) : ''}<rect x="210" y="294" width="380" height="16" fill="#3a1a12"/>`
  const spin = on(p, 'playingFlag', ctx) ? `<animateTransform attributeName="transform" type="scale" values="1 1;-1 1;1 1" dur="2s" repeatCount="indefinite" additive="sum"/>` : ''
  return s + `<g transform="translate(400 290)"><g>${spin}<path d="M0 0 V-70 M-16 -50 L16 -50 M0 -70 L-12 -40 L12 -40Z" stroke="#e6dccb" stroke-width="4" fill="#e6dccb"/><circle cx="0" cy="-80" r="9" fill="#e6dccb"/></g><ellipse cx="0" cy="2" rx="22" ry="5" fill="#c9a35a"/></g>`
}

