// Close-up views, ported from the prototype room. Each fills the whole 800×600 scene.
import { birdKey, clockTimeFrom, FONT, hand, hands, INK, on, str, sym, type Asset, type AssetCtx, type Params } from '../kit.ts'
import { face } from './walls.ts'

// A clock face with two winding holes. Hands follow the clock puzzle; the second hand
// sweeps once `woundFlag` is set.
export const clockFaceClose: Asset = (p, ctx) => {
  const { h, m } = clockTimeFrom(p, ctx)
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><circle cx="400" cy="290" r="212" fill="#d8ccb2" stroke="#7a5b33" stroke-width="16"/>`
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180
    const r1 = i % 5 ? 192 : 182
    s += `<line x1="${(400 + r1 * Math.sin(a)).toFixed(1)}" y1="${(290 - r1 * Math.cos(a)).toFixed(1)}" x2="${(400 + 200 * Math.sin(a)).toFixed(1)}" y2="${(290 - 200 * Math.cos(a)).toFixed(1)}" stroke="#3a2a20" stroke-width="${i % 5 ? 1.5 : 4}"/>`
  }
  numerals.forEach((t, i) => {
    const a = (i * 30 * Math.PI) / 180
    s += `<text x="${(400 + 152 * Math.sin(a)).toFixed(1)}" y="${(290 - 152 * Math.cos(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="30" fill="#3a2a20">${t}</text>`
  })
  const motto = str(p, 'motto', '')
  if (motto) s += `<text x="400" y="225" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="17" fill="#6b5a46">${motto}</text>`
  for (const x of [340, 460]) s += `<circle cx="${x}" cy="345" r="13" fill="#b9ab8e" stroke="#6b5a46" stroke-width="2"/><circle cx="${x}" cy="345" r="5" fill="${ctx.pal.woodDark}"/>`
  s += `<text x="340" y="378" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#6b5a46">hours</text><text x="460" y="378" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#6b5a46">minutes</text>`
  s += hands(400, 290, 95, 150, 10, 6, INK, h, m)
  s += on(p, 'woundFlag', ctx)
    ? `<line x1="400" y1="312" x2="400" y2="112" stroke="#6e2a2a" stroke-width="2.5"><animateTransform attributeName="transform" type="rotate" from="0 400 290" to="360 400 290" dur="60s" repeatCount="indefinite"/></line>`
    : hand(400, 290, 178, 72, 2.5, '#6e2a2a')
  return s + `<circle cx="400" cy="290" r="9" fill="${ctx.pal.woodDark}"/>`
}

export const portraitClose: Asset = (p, ctx) =>
  `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="220" y="40" width="360" height="500" fill="#2e2219"/>${face(400, 295, 1.35, p, ctx)}<rect x="220" y="40" width="360" height="500" fill="none" stroke="#7a5b33" stroke-width="22"/><rect x="330" y="550" width="140" height="32" rx="3" fill="#8c6a35"/><text x="400" y="571" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="17" fill="#3a2a18">${str(p, 'plaque', '')}</text>`

export const drawerClosedClose: Asset = (_p, ctx) =>
  `<rect width="800" height="600" fill="${ctx.pal.woodMid}"/><rect y="80" width="800" height="40" fill="${ctx.pal.woodLight}"/><rect x="150" y="180" width="500" height="220" fill="#553a29" stroke="${ctx.pal.woodDark}" stroke-width="8"/><ellipse cx="400" cy="290" rx="30" ry="44" fill="#8c6a35"/><circle cx="400" cy="280" r="10" fill="#120c09"/><path d="M394 284 L406 284 L410 312 L390 312Z" fill="#120c09"/>`

// The photograph's scene: this room, with a figure in the chair, or at the window once lit.
function photoScene(x: number, y: number, k: number, p: Params, ctx: AssetCtx): string {
  let s = `<g transform="translate(${x} ${y}) scale(${k})"><rect width="600" height="400" fill="#7a6848"/><rect y="320" width="600" height="80" fill="#5e4f36"/><rect x="360" y="60" width="130" height="150" fill="#4a3d2a"/><rect x="422" y="60" width="6" height="150" fill="#3a2e20"/><rect x="110" y="40" width="44" height="120" rx="4" fill="#4a3d2a"/><circle cx="132" cy="70" r="22" fill="#d1c4a4"/>${hands(132, 70, 11, 17, 3, 2, '#2a1f14', 9, 15)}`
  s += `<rect x="190" y="230" width="90" height="14" fill="#3a2e20"/><rect x="194" y="244" width="10" height="86" fill="#3a2e20"/><rect x="266" y="244" width="10" height="86" fill="#3a2e20"/><rect x="266" y="150" width="12" height="94" fill="#3a2e20"/>`
  s += on(p, 'litFlag', ctx)
    ? `<circle cx="425" cy="140" r="18" fill="#2a2014"/><path d="M400 162 L450 162 L456 330 L394 330Z" fill="#2a2014"/>`
    : `<circle cx="232" cy="176" r="18" fill="#2a2014"/><path d="M210 198 L254 198 L262 232 L206 232Z" fill="#2a2014"/>`
  return s + `</g>`
}

// The open drawer: a photograph, and a matchbox until `matchboxGoneFlag`.
export const drawerOpenClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodMid}"/><rect x="110" y="110" width="580" height="400" fill="#1e140e" stroke="${ctx.pal.woodLight}" stroke-width="20"/><g transform="rotate(-6 285 265)"><rect x="200" y="200" width="170" height="130" fill="#cfc3aa"/>${photoScene(210, 210, 150 / 600, p, ctx)}</g>`
  if (!on(p, 'matchboxGoneFlag', ctx))
    s += `<g transform="rotate(8 525 365)"><rect x="470" y="330" width="110" height="70" rx="4" fill="#6e2a2a"/><rect x="490" y="344" width="70" height="38" fill="#cfc3aa"/><text x="525" y="368" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="15" fill="#6e2a2a">Lucifers</text><rect x="470" y="394" width="110" height="6" fill="#3a2a20"/></g>`
  return s
}

export const photoClose: Asset = (p, ctx) =>
  `<rect width="800" height="600" fill="#1e140e"/><rect x="90" y="60" width="620" height="480" fill="#cfc3aa"/>${photoScene(100, 70, 1, p, ctx)}<text x="400" y="528" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="18" fill="#5a4c3e">${str(p, 'caption', '')}</text>`

export const bookClosedClose: Asset = (p, ctx) =>
  `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="250" y="90" width="300" height="420" rx="6" fill="#6e2a2a" stroke="#3d1717" stroke-width="6"/><rect x="270" y="110" width="260" height="380" fill="none" stroke="#b08a4a" stroke-width="1.5"/><text x="400" y="260" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="38" fill="#cfa96a">${str(p, 'title', '')}</text><path d="M370 290 q30 -16 60 0" stroke="#b08a4a" fill="none" stroke-width="1.5"/>`

// An open book of pressed flowers, with a match pressed inside until `matchGoneFlag`.
export const bookOpenClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="120" y="110" width="280" height="380" fill="#d8ccb2"/><rect x="400" y="110" width="280" height="380" fill="#cfc1a3"/><line x1="400" y1="110" x2="400" y2="490" stroke="#9c8e74" stroke-width="3"/><path d="M258 400 Q262 320 252 250 M256 330 Q236 300 222 296 M256 300 Q280 270 292 262" stroke="#6e7a5a" stroke-width="2.5" fill="none"/>`
  for (const [x, y] of [[252, 246], [222, 292], [292, 258], [244, 236], [262, 238]] as const) s += `<circle cx="${x}" cy="${y}" r="7" fill="#6f86a3"/><circle cx="${x}" cy="${y}" r="2.2" fill="#d9c27a"/>`
  s += `<text x="260" y="450" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="19" fill="#5a4c3e">${str(p, 'leftCaption', '')}</text>`
  if (!on(p, 'matchGoneFlag', ctx))
    s += `<line x1="470" y1="340" x2="606" y2="252" stroke="#c9b48a" stroke-width="7" stroke-linecap="round"/><ellipse cx="610" cy="249" rx="9" ry="7" fill="#7a2a20" transform="rotate(-33 610 249)"/><text x="540" y="400" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="19" fill="#5a4c3e">${str(p, 'rightCaption', '')}</text>`
  return s
}

// The plant pot from above: a loop of string in the soil, or a dug hole once `stringGoneFlag`.
export const potClose: Asset = (p, ctx) =>
  `<rect width="800" height="300" fill="url(#wp)"/><rect y="280" width="800" height="24" fill="${ctx.pal.skirting}"/><rect y="304" width="800" height="296" fill="url(#planks)"/><path d="M402 236 L404 90 M403 150 L350 80 M404 120 L452 60 M452 60 L478 44 M350 80 L338 50" stroke="#3a2a20" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M220 250 L580 250 L540 560 L260 560Z" fill="#7a4a33"/><rect x="200" y="222" width="400" height="40" rx="6" fill="#8a563d"/><ellipse cx="400" cy="244" rx="180" ry="20" fill="#2b1e15"/>` +
  (on(p, 'stringGoneFlag', ctx)
    ? `<ellipse cx="330" cy="246" rx="34" ry="9" fill="#140d09"/>`
    : `<path d="M322 246 q8 -40 34 -26 q18 10 4 22" stroke="#cfc3aa" stroke-width="3" fill="none" stroke-linecap="round"/>`)

// The coat up close. Once `sandFlag` is set, sand lies below it, with the winding key until `keyGoneFlag`.
export const coatClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="470" fill="url(#wp)"/><rect y="448" width="800" height="24" fill="${ctx.pal.skirting}"/><rect y="472" width="800" height="128" fill="url(#planks)"/><path d="M330 20 Q220 200 240 470 L560 470 Q580 200 470 20Z" fill="#2c2a26"/><path d="M380 20 L370 300 M420 20 L440 300" stroke="#1f1d1a" stroke-width="6" fill="none"/><path d="M260 300 L370 294 L370 380 Q314 396 266 380Z" fill="#23211e" stroke="#1a1816" stroke-width="4"/>`
  if (on(p, 'sandFlag', ctx)) {
    s += `<path d="M200 600 Q300 470 410 600Z" fill="#a89470"/><path d="M300 380 Q296 430 300 520" stroke="#a89470" stroke-width="3" opacity=".5" fill="none"/>`
    if (!on(p, 'keyGoneFlag', ctx)) s += birdKey(300, 540, 2.2, '#c9a35a')
  }
  return s
}

// The birdcage up close: wired shut, or open once `openFlag`; the key hangs inside until `keyGoneFlag`.
export const cageClose: Asset = (p, ctx) => {
  const open = on(p, 'openFlag', ctx)
  const key = on(p, 'keyGoneFlag', ctx) ? '' : `<line x1="400" y1="390" x2="400" y2="420" stroke="#cfc3aa" stroke-width="2"/>${sym('key', 400, 440, 26, '#c9a35a', false, 5)}`
  let s = `<rect width="800" height="600" fill="#2e3529"/><line x1="400" y1="0" x2="400" y2="80" stroke="#8c6a35" stroke-width="6"/><ellipse cx="400" cy="520" rx="200" ry="24" fill="#6b5226"/><line x1="250" y1="390" x2="550" y2="390" stroke="#6b5226" stroke-width="7"/>`
  if (!open) s += key
  for (let x = 210; x <= 590; x += 24) s += `<path d="M400 84 Q${x} 100 ${x} 230 V520" fill="none" stroke="#8c6a35" stroke-width="4"/>`
  if (open) {
    s += `<rect x="330" y="300" width="140" height="190" fill="#2e3529"/><path d="M330 300 L250 320 L250 500 L330 490" fill="none" stroke="#8c6a35" stroke-width="4"/><line x1="330" y1="390" x2="470" y2="390" stroke="#6b5226" stroke-width="7"/>` + key
  } else {
    s += `<rect x="330" y="300" width="140" height="190" fill="none" stroke="#a88442" stroke-width="5"/><path d="M440 380 q-10 8 0 14 q10 6 -2 14 q-12 8 2 14" stroke="#9aa0a0" stroke-width="4" fill="none"/>`
  }
  return s
}

// The window up close. Once `litFlag` is set, fogged patches show symbols drawn from the
// outside (mirrored), plus the reflected candle and figure. `symbols` is a comma list.
export const windowClose: Asset = (p, ctx) => {
  let s = `<rect width="800" height="600" fill="${ctx.pal.woodDark}"/><rect x="80" y="40" width="640" height="480" fill="url(#glass)"/>`
  if (on(p, 'litFlag', ctx)) {
    s += `<path d="M170 520 L170 420 Q170 360 230 350 Q200 320 205 285 Q210 245 240 245 Q270 245 275 285 Q280 320 250 350 Q310 360 310 420 L310 520Z" fill="#c8d3da" opacity=".2"/><circle cx="625" cy="430" r="5" fill="#f2b54f"/><circle cx="625" cy="430" r="44" fill="${ctx.pal.light}" opacity=".14"/>`
    const symbols = str(p, 'symbols', '').split(',').filter(Boolean)
    const xs = [180, 300, 500, 620]
    symbols.slice(0, 4).forEach((name, i) => {
      const x = xs[i] ?? 180
      s += `<ellipse cx="${x}" cy="170" rx="56" ry="48" fill="#c9d3d8" opacity=".16"/>${sym(name, x, 170, 30, 'rgba(230,237,240,.6)', true, 4)}<line x1="${x - 14}" y1="214" x2="${x - 14}" y2="246" stroke="#c9d3d8" stroke-width="2" opacity=".2"/><line x1="${x + 18}" y1="210" x2="${x + 18}" y2="232" stroke="#c9d3d8" stroke-width="2" opacity=".18"/>`
    })
  }
  return s + `<rect x="395" y="40" width="10" height="480" fill="${ctx.pal.woodDark}"/><rect x="80" y="276" width="640" height="10" fill="${ctx.pal.woodDark}"/>`
}

// The lock plate under a dial lock (the dials themselves are drawn by the puzzle widget),
// with a keyhole that shows the key once `keyFlag` is set.
export const lockPlateClose: Asset = (p, ctx) =>
  `<rect width="800" height="600" fill="${ctx.pal.wood}"/><rect x="60" y="40" width="680" height="520" fill="none" stroke="${ctx.pal.woodDark}" stroke-width="10"/><rect x="160" y="130" width="480" height="340" rx="18" fill="#8c6a35" stroke="#5a4220" stroke-width="6"/><text x="400" y="340" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="21" fill="#4a3618">${str(p, 'inscription', '')}</text><ellipse cx="400" cy="400" rx="26" ry="36" fill="#6b5226"/><circle cx="400" cy="392" r="9" fill="#120c09"/><path d="M395 396 L405 396 L408 420 L392 420Z" fill="#120c09"/>` +
  (on(p, 'keyFlag', ctx) ? `<rect x="395" y="386" width="10" height="40" fill="#c9a35a"/><circle cx="400" cy="440" r="14" fill="none" stroke="#c9a35a" stroke-width="6"/>` : '')
