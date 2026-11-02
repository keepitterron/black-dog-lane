// Room pieces seen on the four walls, ported from the prototype room.
import { clockTimeFrom, cuttersArt, hands, INK, num, on, str, sym, type Asset, type AssetCtx, type Params } from '../kit.ts'

// Wallpaper `pattern` picks one of the motifs in `sceneDefs`.
export const roomShell: Asset = (p, ctx) => {
  const pattern = str(p, 'pattern', 'diamond')
  return `<rect width="800" height="470" fill="url(#${pattern === 'diamond' ? 'wp' : `wp-${pattern}`})"/><rect width="800" height="24" fill="${ctx.pal.rail}"/><rect y="448" width="800" height="24" fill="${ctx.pal.skirting}"/><rect y="472" width="800" height="128" fill="url(#planks)"/>`
}

// Darkness, or warm flickering candlelight centred on (cx, cy) once `litFlag` is set.
export const lighting: Asset = (p, ctx) => {
  if (!on(p, 'litFlag', ctx)) return `<rect width="800" height="600" fill="url(#dark)" pointer-events="none"/>`
  const id = `warm-${num(p, 'cx', 400)}-${num(p, 'cy', 270)}`
  return `<radialGradient id="${id}" cx="${num(p, 'cx', 400)}" cy="${num(p, 'cy', 270)}" r="580" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ctx.pal.light}" stop-opacity=".24"/><stop offset=".45" stop-color="#3a2512" stop-opacity=".18"/><stop offset="1" stop-color="${ctx.pal.dark}" stop-opacity=".78"/></radialGradient><g class="flicker" pointer-events="none"><rect width="800" height="600" fill="url(#${id})"/></g>`
}

// A painted face. Eyes are painted shut in the dark and open in the light; `tiltFlag` turns
// the head towards the clock, `missingEyeFlag` leaves one empty socket, and the left eye
// catches the light (the secret's tell).
export function face(cx: number, cy: number, k: number, p: Params, ctx: AssetCtx): string {
  const lit = on(p, 'litFlag', ctx)
  const tilt = on(p, 'tiltFlag', ctx) && !on(p, 'untiltFlag', ctx) ? 9 : 0
  const g = tilt ? 6 : 0
  let eyes = ''
  for (const [i, ex] of [-22, 22].entries()) {
    if (!lit) eyes += `<path d="M${ex - 11} -25 q11 7 22 0" stroke="#5a4636" stroke-width="3" fill="none"/>`
    else if (i === 0 && on(p, 'missingEyeFlag', ctx)) eyes += `<ellipse cx="${ex}" cy="-25" rx="11" ry="7" fill="#120c09"/>`
    else if (i === 0)
      eyes += `<ellipse cx="${ex}" cy="-25" rx="11" ry="6.5" fill="#eef0ea"/><circle cx="${ex + g}" cy="-25" r="4.6" fill="#6f7e6a"/><circle cx="${ex + g}" cy="-25" r="2" fill="#120c09"/><circle cx="${ex + g - 2}" cy="-27.5" r="1.6" fill="#fff"><animate attributeName="opacity" values="0;0;1;0;0" dur="3.5s" repeatCount="indefinite"/></circle>`
    else eyes += `<ellipse cx="${ex}" cy="-25" rx="11" ry="6.5" fill="#e6dccb"/><circle cx="${ex + g}" cy="-25" r="4.2" fill="#2a2a22"/>`
  }
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M-110 150 Q-90 60 0 55 Q90 60 110 150Z" fill="#2f3a33"/><path d="M-22 40 L22 40 L18 70 L-18 70Z" fill="#a8947a"/><path d="M-30 62 L0 86 L30 62 L22 58 L0 73 L-22 58Z" fill="#cfc3aa"/><g transform="rotate(${tilt} 0 40)"><ellipse cx="0" cy="-20" rx="58" ry="74" fill="#b9a58a"/><path d="M-62 -18 Q-68 -112 0 -102 Q68 -112 62 -18 Q52 -72 0 -74 Q-52 -72 -62 -18Z" fill="#2a1d16"/>${eyes}<path d="M-4 -4 q7 14 0 18" stroke="#8a7660" fill="none" stroke-width="3"/><path d="M-15 32 q15 4 30 0" stroke="#6e4a3e" stroke-width="3" fill="none"/></g></g>`
}

export const portrait: Asset = (p, ctx) =>
  `<rect x="110" y="130" width="140" height="180" fill="#2e2219"/>${face(180, 218, 0.55, p, ctx)}<rect x="110" y="130" width="140" height="180" fill="none" stroke="#7a5b33" stroke-width="10"/>`

// A panelled door with a dial lock. Light shows under it once `litFlag` is set; `feetFlag`
// adds the shadows of feet standing outside (until `feetGoneFlag`); `openFlag` swings it open onto the dark.
export const door: Asset = (p, ctx) => {
  let s = `<rect x="322" y="142" width="156" height="312" fill="${ctx.pal.woodDark}"/>`
  if (on(p, 'openFlag', ctx)) {
    return `${s}<rect x="330" y="150" width="140" height="300" fill="url(#beyond)"/><path d="M470 150 L506 136 L506 466 L470 450Z" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="3"/>`
  }
  s += `<rect x="330" y="150" width="140" height="300" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="4"/><rect x="348" y="170" width="104" height="110" fill="none" stroke="${ctx.pal.woodDark}" stroke-width="4"/><rect x="348" y="300" width="104" height="128" fill="none" stroke="${ctx.pal.woodDark}" stroke-width="4"/><rect x="434" y="280" width="28" height="50" rx="3" fill="#8c6a35"/><circle cx="448" cy="317" r="3" fill="#120c09"/>`
  for (let i = 0; i < 4; i++) s += `<circle cx="${441 + i * 5}" cy="292" r="1.8" fill="${ctx.pal.woodDark}"/>`
  if (on(p, 'keyFlag', ctx)) s += `<rect x="446" y="314" width="4" height="12" fill="#c9a35a"/>`
  if (on(p, 'litFlag', ctx)) {
    s += `<rect x="332" y="445" width="136" height="5" fill="#d9c9a0" opacity=".75"/><path d="M332 450 L468 450 L510 510 L290 510Z" fill="#d9c9a0" opacity=".1"/>`
    if (on(p, 'feetFlag', ctx) && !on(p, 'feetGoneFlag', ctx))
      s += `<rect x="366" y="443" width="26" height="8" fill="#0a0705"/><rect x="408" y="443" width="26" height="8" fill="#0a0705"/><path d="M366 450 L392 450 L404 510 L350 510Z" fill="#0a0705" opacity=".6"/><path d="M408 450 L434 450 L452 510 L398 510Z" fill="#0a0705" opacity=".6"/>`
  }
  return s
}

// A tall case clock. Hands follow the clock puzzle (`puzzle`, starting at h:m); the pendulum
// swings once `woundFlag` is set; `caseOpenFlag` opens the case, showing cutters until
// `cuttersGoneFlag`.
export const caseClock: Asset = (p, ctx) => {
  const { h, m } = clockTimeFrom(p, ctx)
  const open = on(p, 'caseOpenFlag', ctx)
  let s = `<rect x="590" y="150" width="60" height="230" rx="6" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="3"/><rect x="602" y="250" width="36" height="110" fill="#1e1510"/>`
  if (open && !on(p, 'cuttersGoneFlag', ctx)) s += cuttersArt(620, 346, 0.6)
  const swing = on(p, 'woundFlag', ctx)
    ? `<animateTransform attributeName="transform" type="rotate" values="-8 620 240;8 620 240;-8 620 240" dur="2s" repeatCount="indefinite"/>`
    : ''
  s += `<g><line x1="620" y1="240" x2="620" y2="325" stroke="#8c6a35" stroke-width="3"/><circle cx="620" cy="330" r="9" fill="#8c6a35"/>${swing}</g>`
  s += open
    ? `<path d="M602 250 L572 258 L572 368 L602 360Z" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="2"/>`
    : `<rect x="602" y="250" width="36" height="110" fill="#9fb0b8" opacity=".08"/>`
  return s + `<circle cx="620" cy="200" r="34" fill="#d8ccb2" stroke="#7a5b33" stroke-width="5"/>${hands(620, 200, 18, 27, 3, 2, INK, h, m)}`
}

// Two coat hooks and a coat; `movedFlag` puts it on the other hook, `sandFlag` leaves sand below.
export const coatOnHook: Asset = (p, ctx) => {
  const cx = on(p, 'movedFlag', ctx) ? 520 : 0
  let s = `<rect x="118" y="158" width="54" height="8" fill="${ctx.pal.woodDark}"/><rect x="638" y="158" width="54" height="8" fill="${ctx.pal.woodDark}"/><g transform="translate(${cx} 0)"><path d="M132 166 Q100 260 110 420 L192 420 Q202 260 158 166Z" fill="#2c2a26"/><path d="M145 166 L140 300 M150 166 L160 300" stroke="#1f1d1a" stroke-width="3" fill="none"/><path d="M118 320 L150 318 L150 350 Q134 356 120 350Z" fill="#23211e" stroke="#1a1816" stroke-width="2"/></g>`
  if (on(p, 'sandFlag', ctx)) s += `<path d="M${100 + cx} 472 Q${135 + cx} 446 ${170 + cx} 472Z" fill="#a89470"/>`
  return s
}

export const desk: Asset = (p, ctx) => {
  let s = `<rect x="220" y="350" width="360" height="18" fill="${ctx.pal.woodLight}"/><rect x="230" y="368" width="340" height="62" fill="${ctx.pal.woodMid}"/><rect x="236" y="430" width="14" height="44" fill="${ctx.pal.wood}"/><rect x="550" y="430" width="14" height="44" fill="${ctx.pal.wood}"/>`
  s += on(p, 'drawerOpenFlag', ctx)
    ? `<rect x="336" y="384" width="128" height="46" fill="${ctx.pal.woodLight}" stroke="${ctx.pal.woodDark}" stroke-width="3"/><rect x="340" y="378" width="120" height="8" fill="#1a120c"/>`
    : `<rect x="340" y="378" width="120" height="40" fill="#553a29" stroke="${ctx.pal.woodDark}" stroke-width="3"/><circle cx="400" cy="396" r="3" fill="#120c09"/><rect x="398.5" y="397" width="3" height="7" fill="#120c09"/>`
  return s
}

export const note: Asset = (_p, _ctx) =>
  `<path d="M268 346 l72 -9 l4 13 l-72 9z" fill="#d8ccb2"/><path d="M278 345 l52 -6 M280 350 l40 -5" stroke="#8b7f69" stroke-width="1.5"/>`

export const candle: Asset = (p, ctx) =>
  `<ellipse cx="490" cy="350" rx="26" ry="6" fill="#8c6a35"/><rect x="482" y="298" width="16" height="52" fill="#d8ccb2"/><line x1="490" y1="298" x2="490" y2="290" stroke="#1a120c" stroke-width="2"/>` +
  (on(p, 'litFlag', ctx)
    ? `<g class="flicker"><circle cx="490" cy="282" r="70" fill="${ctx.pal.light}" opacity=".12"/><ellipse cx="490" cy="279" rx="7" ry="15" fill="url(#flame)"/></g>`
    : '')

export const rug: Asset = (_p, ctx) => `<ellipse cx="400" cy="545" rx="270" ry="40" fill="${ctx.pal.cloth}" opacity=".85"/>`

// A bookshelf of seeded books with one marked red book.
export const bookshelf: Asset = (p, ctx) => {
  let s = `<rect x="140" y="108" width="280" height="352" fill="${ctx.pal.woodEdge}" stroke="${ctx.pal.wood}" stroke-width="8"/>`
  const rows: [number, number][] = [[118, 186], [198, 266], [278, 346], [358, 452]]
  const cols = ['#5b3a2e', '#38443a', '#6b5a3a', '#2f3640', ctx.pal.cloth, '#5c5246', '#3d4a4f']
  let seed = num(p, 'seed', 11)
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  rows.forEach(([top, bot], r) => {
    let x = 150
    while (x < 408) {
      const w = 14 + Math.floor(rnd() * 16)
      if (x + w > 410) break
      const h = bot - top - Math.floor(rnd() * 22)
      const c = cols[Math.floor(rnd() * cols.length)] ?? '#5b3a2e'
      if (!(r === 1 && x + w > 290 && x < 328)) s += `<rect x="${x}" y="${bot - h}" width="${w}" height="${h}" fill="${c}"/>`
      x += w + 1
    }
  })
  for (const y of [186, 266, 346]) s += `<rect x="144" y="${y}" width="272" height="10" fill="${ctx.pal.wood}"/>`
  s += `<g transform="rotate(-11 310 266)"><rect x="298" y="202" width="24" height="64" fill="#6e2a2a"/><rect x="298" y="212" width="24" height="3" fill="#b08a4a"/><rect x="298" y="252" width="24" height="3" fill="#b08a4a"/></g>`
  return s
}

// A hanging birdcage with a key on the perch until `keyGoneFlag`; `openFlag` opens its door.
export const birdcage: Asset = (p, ctx) => {
  let s = `<line x1="600" y1="24" x2="600" y2="140" stroke="#8c6a35" stroke-width="3"/>`
  for (let x = 546; x <= 654; x += 12) s += `<path d="M600 142 Q${x} 148 ${x} 200 V310" fill="none" stroke="#8c6a35" stroke-width="2"/>`
  s += `<line x1="560" y1="268" x2="640" y2="268" stroke="#6b5226" stroke-width="3"/><ellipse cx="600" cy="310" rx="58" ry="8" fill="#6b5226"/>`
  if (!on(p, 'keyGoneFlag', ctx)) s += `<line x1="600" y1="268" x2="600" y2="282" stroke="#cfc3aa" stroke-width="1.5"/>${sym('key', 600, 290, 9, '#c9a35a', false, 2.5)}`
  if (on(p, 'openFlag', ctx)) s += `<rect x="576" y="250" width="22" height="44" fill="#1e1510" opacity=".7"/>`
  return s
}

// A curtained window over a ledge. Once `litFlag` is set the glass shows reflections:
// fogged patches, the candle and a figure that isn't in the room.
export const curtainedWindow: Asset = (p, ctx) => {
  let s = `<rect x="230" y="90" width="340" height="6" fill="#8c6a35"/><rect x="290" y="110" width="220" height="240" fill="${ctx.pal.woodDark}"/><rect x="302" y="122" width="196" height="216" fill="url(#glass)"/>`
  if (on(p, 'litFlag', ctx)) {
    for (const x of [330, 372, 428, 470]) s += `<ellipse cx="${x}" cy="168" rx="17" ry="14" fill="#c9d3d8" opacity=".16"/>`
    s += `<circle cx="468" cy="300" r="3" fill="#f2b54f"/><circle cx="468" cy="300" r="16" fill="${ctx.pal.light}" opacity=".15"/><path d="M326 338 L326 300 Q326 282 342 278 Q334 268 335 258 Q337 246 346 246 Q355 246 357 258 Q358 268 350 278 Q366 282 366 300 L366 338Z" fill="#c8d3da" opacity=".12"/>`
  }
  return (
    s +
    `<rect x="397" y="122" width="6" height="216" fill="${ctx.pal.woodDark}"/><rect x="302" y="227" width="196" height="6" fill="${ctx.pal.woodDark}"/><rect x="280" y="350" width="240" height="12" fill="${ctx.pal.wood}"/><path d="M244 96 Q272 230 254 386 L292 386 L292 96Z" fill="${ctx.pal.cloth}"/><path d="M556 96 Q528 230 546 386 L508 386 L508 96Z" fill="${ctx.pal.cloth}"/>`
  )
}

// A potted plant with a loop of string in the soil until `stringGoneFlag`.
export const plantPot: Asset = (p, ctx) =>
  `<path d="M220 396 L222 330 M221 352 L196 318 M222 340 L246 304 M246 304 L258 296 M196 318 L190 300" stroke="#3a2a20" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M170 400 L270 400 L258 470 L182 470Z" fill="#7a4a33"/><rect x="164" y="392" width="112" height="14" rx="3" fill="#8a563d"/>` +
  (on(p, 'stringGoneFlag', ctx) ? '' : `<path d="M236 394 q6 -14 12 -4" stroke="#cfc3aa" stroke-width="1.6" fill="none"/>`)

// A plain door to another room, its left edge at `x`. `openFlag` leaves it ajar onto the dark.
export const doorway: Asset = (p, ctx) => {
  const x = num(p, 'x', 322)
  const frame = `<rect x="${x}" y="142" width="156" height="312" fill="${ctx.pal.woodDark}"/>`
  if (on(p, 'openFlag', ctx))
    return `${frame}<rect x="${x + 8}" y="150" width="140" height="300" fill="url(#beyond)"/><path d="M${x + 148} 150 L${x + 184} 136 L${x + 184} 466 L${x + 148} 450Z" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="3"/>`
  return `${frame}<rect x="${x + 8}" y="150" width="140" height="300" fill="${ctx.pal.wood}" stroke="${ctx.pal.woodEdge}" stroke-width="4"/><rect x="${x + 26}" y="170" width="104" height="260" fill="none" stroke="${ctx.pal.woodDark}" stroke-width="4"/><circle cx="${x + 126}" cy="306" r="7" fill="#8c6a35"/>`
}

// A small framed panel filling the box (x, y, w, h), blank or showing `symbol` from the code set.
export const frame: Asset = (p, _ctx) => {
  const [x, y, w, h] = [num(p, 'x', 330), num(p, 'y', 200), num(p, 'w', 140), num(p, 'h', 140)]
  const symbol = str(p, 'symbol', '')
  const mark = symbol ? sym(symbol, x + w / 2, y + h / 2, Math.min(w, h) * 0.3, '#3a2a20') : ''
  return `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" fill="#cfc3aa" stroke="#7a5b33" stroke-width="10"/>${mark}`
}
