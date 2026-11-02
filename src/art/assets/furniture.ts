// Furniture and wall pieces beyond the prototype room. Each is drawn inside the bbox its
// catalog entry declares, centred on x = 400; placement moves and scales it from there.
import { BRASS, clockTimeFrom, FONT, hands, INK, on, PAPER, str, sym, type Asset } from '../kit.ts'

// A high-backed chair; `toppledFlag` leaves it on its side.
export const chair: Asset = (p, ctx) => {
  const { wood, woodDark, woodLight } = ctx.pal
  if (on(p, 'toppledFlag', ctx))
    return `<g transform="rotate(-84 400 472)"><rect x="346" y="258" width="14" height="214" fill="${wood}"/><rect x="440" y="258" width="14" height="214" fill="${wood}"/><rect x="346" y="266" width="108" height="10" fill="${woodLight}"/><rect x="346" y="300" width="108" height="10" fill="${woodLight}"/><rect x="340" y="370" width="120" height="16" fill="${woodLight}" stroke="${woodDark}" stroke-width="2"/><rect x="350" y="386" width="10" height="86" fill="${wood}"/><rect x="440" y="386" width="10" height="86" fill="${wood}"/></g>`
  return `<rect x="346" y="250" width="14" height="222" fill="${wood}"/><rect x="440" y="250" width="14" height="222" fill="${wood}"/><path d="M346 252 Q400 236 454 252 L454 264 Q400 250 346 264Z" fill="${woodLight}"/><rect x="360" y="290" width="80" height="8" fill="${woodLight}"/><rect x="360" y="324" width="80" height="8" fill="${woodLight}"/><rect x="340" y="370" width="120" height="16" fill="${woodLight}" stroke="${woodDark}" stroke-width="2"/><rect x="350" y="386" width="10" height="86" fill="${wood}"/><rect x="440" y="386" width="10" height="86" fill="${wood}"/><rect x="356" y="440" width="88" height="6" fill="${woodDark}"/>`
}

// An oval mirror. It reflects the dark room; `figureFlag` puts someone behind you in it,
// `fogFlag` fogs it with `symbol` drawn in, `crackedFlag` cracks it.
export const mirror: Asset = (p, ctx) => {
  let s = `<ellipse cx="400" cy="210" rx="70" ry="100" fill="#b08a4a"/><ellipse cx="400" cy="210" rx="60" ry="90" fill="url(#glass)"/><path d="M362 160 Q372 140 392 132" stroke="#c9d3d8" stroke-width="3" opacity=".25" fill="none"/>`
  if (on(p, 'figureFlag', ctx))
    s += `<path d="M380 300 L380 236 Q380 220 392 216 Q384 208 385 198 Q387 186 400 186 Q413 186 415 198 Q416 208 408 216 Q420 220 420 236 L420 300Z" fill="#0a0806" opacity=".75"/>`
  if (on(p, 'fogFlag', ctx)) {
    s += `<ellipse cx="400" cy="210" rx="56" ry="84" fill="#c9d3d8" opacity=".22"/>`
    const symbol = str(p, 'symbol', '')
    if (symbol) s += sym(symbol, 400, 210, 26, 'rgba(230,237,240,.55)', true, 4)
  }
  if (on(p, 'crackedFlag', ctx)) s += `<path d="M412 150 L398 196 L420 214 L392 262 M398 196 L370 204 M420 214 L446 232" stroke="#e6edf0" stroke-width="1.6" opacity=".6" fill="none"/>`
  return s
}

// A low cabinet; `openFlag` opens both doors on a dark shelf.
export const cabinet: Asset = (p, ctx) => {
  const { wood, woodDark, woodEdge, woodLight } = ctx.pal
  let s = `<rect x="300" y="330" width="200" height="14" fill="${woodLight}"/><rect x="306" y="344" width="188" height="116" fill="${wood}" stroke="${woodEdge}" stroke-width="3"/><rect x="310" y="460" width="12" height="12" fill="${woodDark}"/><rect x="478" y="460" width="12" height="12" fill="${woodDark}"/>`
  if (on(p, 'openFlag', ctx))
    s += `<rect x="314" y="352" width="172" height="100" fill="#120c09"/><rect x="314" y="398" width="172" height="5" fill="${woodDark}"/><path d="M314 352 L290 360 L290 448 L314 452Z" fill="${wood}" stroke="${woodEdge}" stroke-width="2"/><path d="M486 352 L510 360 L510 448 L486 452Z" fill="${wood}" stroke="${woodEdge}" stroke-width="2"/>`
  else
    s += `<rect x="316" y="354" width="80" height="96" fill="none" stroke="${woodDark}" stroke-width="3"/><rect x="404" y="354" width="80" height="96" fill="none" stroke="${woodDark}" stroke-width="3"/><circle cx="390" cy="402" r="4" fill="#8c6a35"/><circle cx="410" cy="402" r="4" fill="#8c6a35"/>`
  return s
}

// A narrow iron bed. `underFlag` shows two pale eyes under it; `rumpledFlag` rucks the blanket.
export const bed: Asset = (p, ctx) => {
  const { cloth } = ctx.pal
  const blanket = on(p, 'rumpledFlag', ctx)
    ? `<path d="M232 380 Q300 352 360 376 Q430 400 500 368 Q540 360 568 378 L568 430 L232 430Z" fill="${cloth}"/>`
    : `<rect x="232" y="372" width="336" height="58" fill="${cloth}"/><rect x="232" y="372" width="336" height="6" fill="#00000033"/>`
  let s = `<path d="M228 300 V472 M228 320 Q228 300 250 300 Q280 300 280 320 V380" stroke="#6b6b62" stroke-width="6" fill="none"/><path d="M572 340 V472" stroke="#6b6b62" stroke-width="6"/><rect x="232" y="380" width="336" height="14" fill="#8a8274"/><rect x="246" y="358" width="70" height="26" rx="10" fill="#cfc3aa"/>${blanket}<rect x="232" y="430" width="336" height="6" fill="#4a463e"/>`
  s += `<rect x="236" y="436" width="328" height="34" fill="#0a0806" opacity=".85"/>`
  if (on(p, 'underFlag', ctx)) s += `<circle cx="384" cy="452" r="3" fill="#d9e0c6"/><circle cx="404" cy="452" r="3" fill="#d9e0c6"/>`
  return s
}

// A tall wardrobe; `openFlag` sets one door ajar on the dark, `eyesFlag` puts eyes in the gap.
export const wardrobe: Asset = (p, ctx) => {
  const { wood, woodDark, woodEdge, woodLight } = ctx.pal
  let s = `<rect x="310" y="80" width="180" height="16" fill="${woodLight}"/><rect x="316" y="96" width="168" height="364" fill="${wood}" stroke="${woodEdge}" stroke-width="4"/><rect x="320" y="460" width="14" height="12" fill="${woodDark}"/><rect x="466" y="460" width="14" height="12" fill="${woodDark}"/>`
  s += `<rect x="326" y="108" width="68" height="340" fill="none" stroke="${woodDark}" stroke-width="3"/><circle cx="392" cy="280" r="4" fill="#8c6a35"/>`
  if (on(p, 'openFlag', ctx)) {
    s += `<rect x="400" y="100" width="80" height="356" fill="#070605"/><path d="M480 100 L508 92 L508 466 L480 456Z" fill="${wood}" stroke="${woodEdge}" stroke-width="3"/>`
    if (on(p, 'eyesFlag', ctx)) s += `<circle cx="428" cy="250" r="3" fill="#d9e0c6"/><circle cx="446" cy="250" r="3" fill="#d9e0c6"/>`
  } else s += `<rect x="406" y="108" width="68" height="340" fill="none" stroke="${woodDark}" stroke-width="3"/><circle cx="408" cy="280" r="4" fill="#8c6a35"/>`
  return s
}

// An upright piano; `lidOpenFlag` shows the keys, `litFlag` lights a candle on top.
export const piano: Asset = (p, ctx) => {
  const { wood, woodDark, woodEdge } = ctx.pal
  let s = `<rect x="250" y="230" width="300" height="140" fill="${wood}" stroke="${woodEdge}" stroke-width="4"/><rect x="240" y="226" width="320" height="10" fill="${woodDark}"/><rect x="268" y="250" width="264" height="70" fill="none" stroke="${woodDark}" stroke-width="3"/><rect x="240" y="370" width="320" height="22" fill="${woodDark}"/><rect x="256" y="392" width="288" height="66" fill="${wood}" stroke="${woodEdge}" stroke-width="3"/><rect x="262" y="458" width="16" height="14" fill="${woodDark}"/><rect x="522" y="458" width="16" height="14" fill="${woodDark}"/>`
  if (on(p, 'lidOpenFlag', ctx)) {
    s += `<rect x="252" y="356" width="296" height="20" fill="#e6dccb"/>`
    for (let x = 260; x < 544; x += 13) s += `<line x1="${x}" y1="356" x2="${x}" y2="376" stroke="#9c907a" stroke-width="1"/>`
    // Black keys sit after white keys 0, 1, 3, 4 and 5 of each octave.
    for (let i = 0; i < 21; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) s += `<rect x="${269 + i * 13}" y="356" width="7" height="12" fill="#1a1410"/>`
  } else s += `<rect x="250" y="358" width="300" height="16" fill="${woodDark}"/>`
  s += `<rect x="460" y="208" width="10" height="20" fill="${PAPER}"/>`
  if (on(p, 'litFlag', ctx)) s += `<g class="flicker"><circle cx="465" cy="200" r="40" fill="${ctx.pal.light}" opacity=".12"/><ellipse cx="465" cy="198" rx="4" ry="9" fill="url(#flame)"/></g>`
  return s
}

export const shelf: Asset = (_p, ctx) =>
  `<rect x="320" y="270" width="160" height="12" fill="${ctx.pal.woodLight}"/><path d="M336 282 L346 300 L352 282 M448 282 L454 300 L464 282" fill="${ctx.pal.woodDark}"/>`

export const table: Asset = (_p, ctx) =>
  `<ellipse cx="400" cy="368" rx="70" ry="10" fill="${ctx.pal.woodLight}"/><rect x="330" y="366" width="140" height="10" fill="${ctx.pal.wood}"/><rect x="394" y="376" width="12" height="84" fill="${ctx.pal.wood}"/><path d="M360 472 Q400 448 440 472" stroke="${ctx.pal.wood}" stroke-width="10" fill="none"/>`

// A round wall clock; hands follow the clock puzzle, `stoppedFlag` cracks the glass.
export const wallClock: Asset = (p, ctx) => {
  const { h, m } = clockTimeFrom(p, ctx)
  let s = `<circle cx="400" cy="170" r="60" fill="${ctx.pal.wood}"/><circle cx="400" cy="170" r="50" fill="${PAPER}"/>`
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180
    s += `<line x1="${(400 + 42 * Math.sin(a)).toFixed(1)}" y1="${(170 - 42 * Math.cos(a)).toFixed(1)}" x2="${(400 + 48 * Math.sin(a)).toFixed(1)}" y2="${(170 - 48 * Math.cos(a)).toFixed(1)}" stroke="${INK}" stroke-width="${i % 3 ? 1.5 : 3}"/>`
  }
  s += hands(400, 170, 24, 38, 4, 2.5, INK, h, m) + `<circle cx="400" cy="170" r="3" fill="${INK}"/>`
  if (on(p, 'stoppedFlag', ctx)) s += `<path d="M372 136 L396 168 L384 204 M396 168 L432 158" stroke="#e6edf0" stroke-width="1.4" opacity=".7" fill="none"/>`
  return s
}

// A bare window on the night. `moonFlag` shows the moon, `rainFlag` rain, `faceFlag` a pale
// face pressed to the glass.
export const plainWindow: Asset = (p, ctx) => {
  const { wood, woodDark } = ctx.pal
  let s = `<rect x="300" y="110" width="200" height="220" fill="${woodDark}"/><rect x="310" y="120" width="180" height="200" fill="url(#glass)"/>`
  if (on(p, 'moonFlag', ctx)) s += `<circle cx="450" cy="160" r="18" fill="#d9dccf" opacity=".8"/><circle cx="458" cy="154" r="16" fill="#1a222b"/>`
  if (on(p, 'rainFlag', ctx)) for (let i = 0; i < 18; i++) s += `<line x1="${318 + ((i * 37) % 170)}" y1="${128 + ((i * 53) % 170)}" x2="${314 + ((i * 37) % 170)}" y2="${142 + ((i * 53) % 170)}" stroke="#9fb0b8" stroke-width="1.2" opacity=".5"/>`
  if (on(p, 'faceFlag', ctx)) s += `<ellipse cx="360" cy="250" rx="26" ry="32" fill="#c8cfc6" opacity=".55"/><ellipse cx="350" cy="244" rx="5" ry="4" fill="#0a0806"/><ellipse cx="370" cy="244" rx="5" ry="4" fill="#0a0806"/><path d="M352 266 q8 4 16 0" stroke="#0a0806" stroke-width="2" fill="none"/>`
  return s + `<rect x="396" y="120" width="8" height="200" fill="${woodDark}"/><rect x="310" y="216" width="180" height="8" fill="${woodDark}"/><rect x="292" y="320" width="216" height="10" fill="${wood}"/>`
}

// One mark of a trail puzzle: a chalk `symbol`, ringed once `doneFlag` is set.
export const trailMark: Asset = (p, ctx) => {
  let s = sym(str(p, 'symbol', 'hand'), 400, 330, 20, 'rgba(226,222,208,.7)', false, 3)
  if (on(p, 'doneFlag', ctx)) s += `<circle cx="400" cy="330" r="27" fill="none" stroke="rgba(226,222,208,.5)" stroke-width="2" stroke-dasharray="4 5"/>`
  return s
}

// Shared by close-ups that put an inscription under a widget.
export function inscription(text: string, y: number, col = '#4a3618'): string {
  return text ? `<text x="400" y="${y}" text-anchor="middle" font-family="${FONT}" font-style="italic" font-size="21" fill="${col}">${text}</text>` : ''
}

// The wind-up key used on the music box, on the side of a box at (x, y).
export function windKey(x: number, y: number, k: number): string {
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="0" y="-3" width="14" height="6" fill="${BRASS}"/><path d="M14 0 q8 -14 14 0 q-6 14 -14 0z" fill="${BRASS}"/></g>`
}

