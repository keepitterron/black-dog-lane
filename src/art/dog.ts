// The dog: a big half-pitbull, half-labrador with a shiny black coat, floppy ears, hazel eyes,
// a white stripe along the top of the muzzle, a white chest patch and white paw tips.
// Drawn as a small rig (body, legs, neck, head, tail) so every pose shares one look, with a
// warm rim so it stays visible in the darkest room. There are deliberately no scared, hurt,
// sad or menacing poses.
//
// Coordinates: a 240×180 box, facing right, ground at y≈172.

export const DOG_POSES = ['sit', 'lie', 'trot', 'sniff', 'paw', 'fetch', 'wag', 'playBow', 'standGuard', 'nuzzle'] as const
export type DogPose = (typeof DOG_POSES)[number]
export type DogCarry = 'bone' | 'ball' | 'key'

export type DogOptions = {
  pose?: DogPose
  facing?: 'left' | 'right'
  carrying?: DogCarry | null
  // SMIL animation (tail wag, trot, sniffing). Off for prefers-reduced-motion and stills.
  motion?: boolean
}

export const DOG_BOX = { width: 240, height: 180 }

const C = {
  coat: '#0e0c0b',
  far: '#060505',
  sheen: '#4a423b',
  ear: '#1d1816',
  white: '#ece5d8',
  rim: '#e3a84b',
  iris: '#a8782e',
  nose: '#050404',
  tongue: '#d97a80',
  mouth: '#2a0f10',
}

type Pt = [number, number]
type Leg = { at: Pt; a1: number; a2: number; l1?: number; l2?: number }
type Rig = {
  body: { cx: number; cy: number; rx: number; ry: number; rot: number }
  haunch: { cx: number; cy: number; rx: number; ry: number; rot?: number }
  legs: { hf: Leg; ff: Leg; hn: Leg; fn: Leg }
  neck: [Pt, Pt]
  head: { x: number; y: number; rot: number; mouth: 'closed' | 'open'; eyes: 'open' | 'closed'; ears: 'down' | 'perk' }
  tail: { at: Pt; angle: number; bend: number; len: number }
  anim: { tail?: 'wag' | 'slow'; legs?: 'trot' | 'paw'; head?: 'bob' | 'nuzzle' }
}

const STAND: Rig = {
  body: { cx: 112, cy: 106, rx: 50, ry: 31, rot: -3 },
  haunch: { cx: 80, cy: 108, rx: 26, ry: 29 },
  legs: {
    hf: { at: [88, 120], a1: -6, a2: -10, l1: 26, l2: 26 },
    ff: { at: [132, 120], a1: 6, a2: -4, l1: 26, l2: 26 },
    hn: { at: [78, 120], a1: 10, a2: -14, l1: 26, l2: 26 },
    fn: { at: [142, 120], a1: 0, a2: 0, l1: 26, l2: 26 },
  },
  neck: [[140, 100], [158, 72]],
  head: { x: 166, y: 60, rot: 0, mouth: 'closed', eyes: 'open', ears: 'down' },
  tail: { at: [64, 96], angle: 25, bend: 10, len: 34 },
  anim: {},
}

const SIT: Rig = {
  body: { cx: 101, cy: 125, rx: 38, ry: 34, rot: -62 },
  haunch: { cx: 88, cy: 145, rx: 31, ry: 26 },
  legs: {
    hf: { at: [104, 160], a1: 90, a2: 90, l1: 10, l2: 12 },
    ff: { at: [120, 124], a1: 2, a2: 0, l1: 23, l2: 23 },
    hn: { at: [94, 162], a1: 90, a2: 90, l1: 12, l2: 14 },
    fn: { at: [130, 124], a1: 0, a2: 0, l1: 23, l2: 23 },
  },
  neck: [[122, 102], [140, 70]],
  head: { x: 148, y: 58, rot: 0, mouth: 'closed', eyes: 'open', ears: 'down' },
  tail: { at: [66, 158], angle: -8, bend: -8, len: 32 },
  anim: {},
}

const RIGS: Record<DogPose, Rig> = {
  sit: SIT,
  lie: {
    body: { cx: 110, cy: 146, rx: 52, ry: 22, rot: 0 },
    haunch: { cx: 80, cy: 148, rx: 24, ry: 21 },
    legs: {
      hf: { at: [88, 160], a1: 84, a2: 94, l1: 12, l2: 12 },
      ff: { at: [134, 160], a1: 88, a2: 92, l1: 18, l2: 20 },
      hn: { at: [80, 162], a1: 82, a2: 95, l1: 14, l2: 14 },
      fn: { at: [142, 164], a1: 90, a2: 90, l1: 18, l2: 20 },
    },
    neck: [[140, 140], [154, 120]],
    head: { x: 160, y: 112, rot: 0, mouth: 'closed', eyes: 'open', ears: 'down' },
    tail: { at: [60, 150], angle: -6, bend: -8, len: 32 },
    anim: { tail: 'slow' },
  },
  trot: {
    ...STAND,
    head: { ...STAND.head, y: 58, mouth: 'open' },
    tail: { ...STAND.tail, angle: 35 },
    anim: { legs: 'trot', tail: 'slow' },
  },
  sniff: {
    ...STAND,
    body: { cx: 110, cy: 108, rx: 50, ry: 27, rot: 8 },
    legs: {
      hf: { at: [88, 112], a1: -6, a2: -10 },
      ff: { at: [132, 120], a1: 6, a2: -4, l1: 27, l2: 26 },
      hn: { at: [78, 112], a1: 10, a2: -14, l1: 31, l2: 30 },
      fn: { at: [142, 120], a1: 0, a2: 0, l1: 27, l2: 26 },
    },
    neck: [[140, 108], [166, 136]],
    head: { x: 172, y: 142, rot: 40, mouth: 'closed', eyes: 'open', ears: 'down' },
    tail: { at: [64, 98], angle: 55, bend: 12, len: 34 },
    anim: { head: 'bob', tail: 'slow' },
  },
  paw: {
    ...SIT,
    legs: { ...SIT.legs, fn: { at: [130, 122], a1: 75, a2: 20, l1: 23, l2: 22 } },
    head: { ...SIT.head, rot: 12 },
    anim: { legs: 'paw', tail: 'slow' },
  },
  fetch: {
    ...STAND,
    head: { ...STAND.head, y: 58 },
    tail: { ...STAND.tail, angle: 40 },
    anim: { tail: 'wag' },
  },
  wag: {
    ...SIT,
    head: { ...SIT.head, rot: -6, mouth: 'open' },
    anim: { tail: 'wag' },
  },
  playBow: {
    body: { cx: 106, cy: 120, rx: 50, ry: 26, rot: 24 },
    haunch: { cx: 78, cy: 104, rx: 24, ry: 26 },
    legs: {
      hf: { at: [86, 110], a1: -4, a2: -8, l1: 30, l2: 32 },
      ff: { at: [134, 160], a1: 88, a2: 92, l1: 18, l2: 22 },
      hn: { at: [76, 110], a1: 8, a2: -12, l1: 30, l2: 32 },
      fn: { at: [142, 162], a1: 90, a2: 90, l1: 18, l2: 22 },
    },
    neck: [[142, 140], [164, 124]],
    head: { x: 172, y: 120, rot: -10, mouth: 'open', eyes: 'open', ears: 'down' },
    tail: { at: [60, 88], angle: 60, bend: 14, len: 34 },
    anim: { tail: 'wag' },
  },
  standGuard: {
    ...STAND,
    legs: {
      hf: { at: [88, 116], a1: -8, a2: -10 },
      ff: { at: [132, 114], a1: 8, a2: -2 },
      hn: { at: [78, 116], a1: 14, a2: -16 },
      fn: { at: [142, 114], a1: 4, a2: -2 },
    },
    neck: [[140, 98], [162, 72]],
    head: { x: 172, y: 64, rot: 4, mouth: 'closed', eyes: 'open', ears: 'perk' },
    tail: { at: [64, 96], angle: 12, bend: 4, len: 36 },
    anim: {},
  },
  nuzzle: {
    ...STAND,
    neck: [[140, 98], [166, 90]],
    head: { x: 176, y: 94, rot: 26, mouth: 'closed', eyes: 'closed', ears: 'down' },
    anim: { head: 'nuzzle', tail: 'slow' },
  },
}

const HEAD_SCALE = 1.18
const f = (n: number) => Math.round(n * 10) / 10
const rad = (deg: number) => (deg * Math.PI) / 180

// Angles are measured from straight down; positive swings the leg forward (towards +x).
function legPoints({ at, a1, a2, l1 = 30, l2 = 28 }: Leg): [Pt, Pt, Pt] {
  const knee: Pt = [at[0] + l1 * Math.sin(rad(a1)), at[1] + l1 * Math.cos(rad(a1))]
  const foot: Pt = [knee[0] + l2 * Math.sin(rad(a2)), knee[1] + l2 * Math.cos(rad(a2))]
  return [at, knee, foot]
}

function rotate(anim: 'wag' | 'slow' | 'trot' | 'trotB' | 'paw' | 'bob' | 'nuzzle', [x, y]: Pt): string {
  const spec: [string, string] = ({
    wag: ['-14;18;-14', '0.36s'],
    slow: ['-6;8;-6', '1.4s'],
    trot: ['-18;16;-18', '0.5s'],
    trotB: ['16;-18;16', '0.5s'],
    paw: ['0;-14;0', '0.6s'],
    bob: ['0;6;0', '0.45s'],
    nuzzle: ['-5;5;-5', '1s'],
  } satisfies Record<string, [string, string]>)[anim]
  const values = spec[0].split(';').map(a => `${a} ${f(x)} ${f(y)}`).join(';')
  return `<animateTransform attributeName="transform" type="rotate" values="${values}" dur="${spec[1]}" repeatCount="indefinite"/>`
}

// Each part is drawn twice: once as the rim (outline) behind everything, once as the body.
type Part = { shapes: (paint: Paint) => string; details?: string; anim?: string }
type Paint = { fill: string; extra: number; rim: boolean }

function legPart(leg: Leg, fill: string, anim?: string): Part {
  const [hip, knee, foot] = legPoints(leg)
  const d = `M${f(hip[0])} ${f(hip[1])} L${f(knee[0])} ${f(knee[1])} L${f(foot[0])} ${f(foot[1])}`
  return {
    shapes: p =>
      `<path d="${d}" fill="none" stroke="${p.rim ? p.fill : fill}" stroke-width="${18 + p.extra}" stroke-linecap="round" stroke-linejoin="round"/>`,
    details: `<ellipse cx="${f(foot[0] + 3)}" cy="${f(foot[1] + 1)}" rx="8.5" ry="5" fill="${C.white}"/>`,
    ...(anim ? { anim } : {}),
  }
}

function headDetails(head: Rig['head'], carrying: DogCarry | null): string {
  const eye =
    head.eyes === 'open'
      ? `<circle cx="10" cy="-7" r="3.8" fill="${C.iris}"/><circle cx="10.6" cy="-7" r="1.9" fill="#120b06"/><circle cx="9.3" cy="-8.4" r="1" fill="#fff"/>`
      : `<path d="M6 -7 Q10 -4 14 -7" fill="none" stroke="${C.iris}" stroke-width="1.6" stroke-linecap="round"/>`
  const ear =
    head.ears === 'perk'
      ? `<path d="M-4 -17 Q-17 -20 -18 -6 Q-17 2 -10 2 Q-4 -6 -4 -17 Z" fill="${C.ear}"/>`
      : `<path d="M-3 -17 Q-16 -15 -15 2 Q-12 11 -6 7 Q-1 -5 -3 -17 Z" fill="${C.ear}"/>`
  const mouth =
    head.mouth === 'open'
      ? `<path d="M37 8 Q28 15 18 10 Q26 18 34 13 Z" fill="${C.mouth}"/><path d="M26 12 Q24 22 29 23 Q34 22 32 13 Z" fill="${C.tongue}"/>`
      : `<path d="M37 9 Q28 13 19 9" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>`
  return (
    `<path d="M-12 -14 Q0 -22 12 -18" fill="none" stroke="${C.sheen}" stroke-width="2" stroke-linecap="round" opacity=".7"/>` +
    ear +
    mouth +
    `<path d="M13 -15 Q27 -14.5 37 -8" fill="none" stroke="${C.white}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<ellipse cx="39" cy="-3" rx="4.6" ry="3.7" fill="${C.nose}"/><ellipse cx="38" cy="-4.5" rx="1.6" ry="1" fill="#5a5450"/>` +
    eye +
    (carrying ? carried(carrying) : '')
  )
}

function carried(item: DogCarry): string {
  if (item === 'ball') return `<circle cx="32" cy="12" r="8" fill="#b8473a"/><path d="M25 10 Q32 14 39 10" stroke="#e8d6b0" stroke-width="1.5" fill="none"/>`
  if (item === 'key') return `<g transform="translate(30 11)"><circle cx="-9" cy="0" r="5" fill="none" stroke="#c9a35a" stroke-width="2.6"/><path d="M-4 0 H12 M8 0 V5 M11 0 V4" stroke="#c9a35a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`
  return `<g transform="translate(30 11)"><rect x="-12" y="-2.5" width="24" height="5" rx="2.5" fill="${C.white}"/><circle cx="-12" cy="-3" r="3.6" fill="${C.white}"/><circle cx="-12" cy="3" r="3.6" fill="${C.white}"/><circle cx="12" cy="-3" r="3.6" fill="${C.white}"/><circle cx="12" cy="3" r="3.6" fill="${C.white}"/></g>`
}

export function dogSvgInner({ pose = 'sit', facing = 'right', carrying = null, motion = true }: DogOptions = {}): string {
  const rig = RIGS[pose]
  const { body, haunch, legs, neck, head, tail } = rig
  const anim = motion ? rig.anim : {}
  const trot = anim.legs === 'trot'

  const tailEnd: Pt = [tail.at[0] - tail.len * Math.cos(rad(tail.angle)), tail.at[1] - tail.len * Math.sin(rad(tail.angle))]
  const tailCtl: Pt = [(tail.at[0] + tailEnd[0]) / 2, (tail.at[1] + tailEnd[1]) / 2 - tail.bend]
  const tailD = `M${f(tail.at[0])} ${f(tail.at[1])} Q${f(tailCtl[0])} ${f(tailCtl[1])} ${f(tailEnd[0])} ${f(tailEnd[1])}`

  const parts: Part[] = [
    legPart(legs.hf, C.far, trot ? rotate('trotB', legs.hf.at) : undefined),
    legPart(legs.ff, C.far, trot ? rotate('trot', legs.ff.at) : undefined),
    {
      shapes: p => `<path d="${tailD}" fill="none" stroke="${p.fill}" stroke-width="${9 + p.extra}" stroke-linecap="round"/>`,
      ...(anim.tail ? { anim: rotate(anim.tail, tail.at) } : {}),
    },
    {
      shapes: p =>
        `<ellipse cx="${body.cx}" cy="${body.cy}" rx="${body.rx + p.extra / 2}" ry="${body.ry + p.extra / 2}" transform="rotate(${body.rot} ${body.cx} ${body.cy})" fill="${p.fill}"/>`,
      details: `<path d="M${body.cx - body.rx * 0.6} ${body.cy - body.ry * 0.78} Q${body.cx} ${body.cy - body.ry * 1.05} ${body.cx + body.rx * 0.55} ${body.cy - body.ry * 0.8}" transform="rotate(${body.rot} ${body.cx} ${body.cy})" fill="none" stroke="${C.sheen}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`,
    },
    {
      shapes: p =>
        `<ellipse cx="${haunch.cx}" cy="${haunch.cy}" rx="${haunch.rx + p.extra / 2}" ry="${haunch.ry + p.extra / 2}" transform="rotate(${haunch.rot ?? 0} ${haunch.cx} ${haunch.cy})" fill="${p.fill}"/>`,
    },
    legPart(legs.hn, C.coat, trot ? rotate('trot', legs.hn.at) : undefined),
    {
      shapes: p =>
        `<path d="M${neck[0][0]} ${neck[0][1]} L${neck[1][0]} ${neck[1][1]}" stroke="${p.fill}" stroke-width="${30 + p.extra}" stroke-linecap="round"/>`,
      details: chestPatch(neck),
    },
    legPart(legs.fn, C.coat, trot ? rotate('trotB', legs.fn.at) : anim.legs === 'paw' ? rotate('paw', legs.fn.at) : undefined),
    {
      shapes: p =>
        `<g transform="translate(${head.x} ${head.y}) rotate(${head.rot}) scale(${HEAD_SCALE})"><ellipse cx="0" cy="0" rx="${21 + p.extra / 2}" ry="${19 + p.extra / 2}" fill="${p.fill}"/>` +
        `<path d="M4 -13 Q30 -15 39 -7 Q44 2 39 10 Q28 16 6 14 Z" fill="${p.fill}" stroke="${p.fill}" stroke-width="${p.extra}" stroke-linejoin="round"/>` +
        `<ellipse cx="6" cy="6" rx="${16 + p.extra / 2}" ry="${13 + p.extra / 2}" fill="${p.fill}"/></g>`,
      details: `<g transform="translate(${head.x} ${head.y}) rotate(${head.rot}) scale(${HEAD_SCALE})">${headDetails(head, carrying)}</g>`,
      ...(anim.head ? { anim: rotate(anim.head, neck[0]) } : {}),
    },
  ]

  const rimPass = parts.map(p => `<g>${p.anim ?? ''}${p.shapes({ fill: C.rim, extra: 5, rim: true })}</g>`).join('')
  const bodyPass = parts.map(p => `<g>${p.anim ?? ''}${p.shapes({ fill: C.coat, extra: 0, rim: false })}${p.details ?? ''}</g>`).join('')
  const flip = facing === 'left' ? ` transform="translate(${DOG_BOX.width} 0) scale(-1 1)"` : ''
  return `<g class="bdl-dog"${flip}><ellipse cx="112" cy="173" rx="70" ry="5" fill="#000" opacity=".35"/><g opacity=".6">${rimPass}</g>${bodyPass}</g>`
}

function chestPatch([[x1, y1], [x2, y2]]: [Pt, Pt]): string {
  // A soft white blaze on the front of the chest, just below the neck.
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
  return `<g transform="translate(${x1 + 6} ${y1 + 2}) rotate(${f(angle + 90)})"><path d="M-5 -6 Q2 -10 6 -4 Q8 8 2 16 Q-4 10 -5 -6 Z" fill="${C.white}"/></g>`
}

export function dogSvg(options: DogOptions = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DOG_BOX.width} ${DOG_BOX.height}">${dogSvgInner(options)}</svg>`
}

// The dog's head alone, for the inventory slot (a 100×100 box).
export function dogHeadSvgInner(): string {
  const head = { ...SIT.head, x: 46, y: 52, rot: -4, mouth: 'open' as const }
  const shape = (fill: string, extra: number) =>
    `<g transform="translate(${head.x} ${head.y}) rotate(${head.rot}) scale(1.25)"><ellipse rx="${21 + extra / 2}" ry="${19 + extra / 2}" fill="${fill}"/>` +
    `<path d="M4 -13 Q30 -15 39 -7 Q44 2 39 10 Q28 16 6 14 Z" fill="${fill}" stroke="${fill}" stroke-width="${extra}" stroke-linejoin="round"/>` +
    `<ellipse cx="6" cy="6" rx="${16 + extra / 2}" ry="${13 + extra / 2}" fill="${fill}"/></g>`
  return `<g opacity=".6">${shape(C.rim, 4)}</g>${shape(C.coat, 0)}<g transform="translate(${head.x} ${head.y}) rotate(${head.rot}) scale(1.25)">${headDetails(head, null)}</g>`
}
