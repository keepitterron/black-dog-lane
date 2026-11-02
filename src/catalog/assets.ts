// The asset catalog's metadata: what every asset is, which params it takes, which flags it
// reacts to and where it may stand. Pure data and geometry, so the validator and the generator
// can read it without the drawing code in src/art (which implements one renderer per id).
import type { Rect } from '../engine/layout.ts'

export const SYMBOLS = ['moon', 'eye', 'key', 'bird', 'sun', 'star', 'hand', 'fish', 'tree', 'crown', 'paw', 'bone'] as const

export const PALETTE_IDS = ['waiting', 'plain', 'attic', 'cellar', 'nursery', 'study', 'ash'] as const
export type PaletteId = (typeof PALETTE_IDS)[number]
export const isPaletteId = (id: string): id is PaletteId => (PALETTE_IDS as readonly string[]).includes(id)

// Shells and close-ups fill the 800×600 scene. Wall pieces and props can be placed: by `slot`,
// or at an anchor point (`atX`, `atY`), optionally resized by `scale`.
export type AssetKind = 'shell' | 'wall' | 'prop' | 'closeUp'
export const SLOTS = ['left', 'centre', 'right', 'floor', 'ceiling'] as const
export type Slot = (typeof SLOTS)[number]
const isSlot = (s: unknown): s is Slot => typeof s === 'string' && (SLOTS as readonly string[]).includes(s)
// Which point of the bbox stays put: its bottom centre (stands on something), centre (hangs
// on the wall) or top centre (hangs from above).
export type Anchor = 'floor' | 'wall' | 'hang'

export type ParamSpec =
  | { type: 'flag' }
  | { type: 'number'; min: number; max: number; default: number; int?: true }
  | { type: 'text'; default: string; max: number }
  | { type: 'enum'; values: readonly string[]; default: string }
  | { type: 'symbol'; default: string }
  | { type: 'symbols'; max: number }
  | { type: 'puzzle' }
  | { type: 'prop' }

export type AssetMeta = {
  kind: AssetKind
  // One neutral line for the generator prompt; never level content.
  describe: string
  params: Record<string, ParamSpec>
  // Where the drawing sits in its own coordinates (wall pieces and props only).
  bbox?: Rect | ((p: Params) => Rect)
  anchor?: Anchor
  slots?: readonly Slot[]
  // Props are drawn around the origin; unplaced, their anchor goes here.
  home?: readonly [x: number, y: number]
}

export type Params = Record<string, number | string>

// Each slot fixes a horizontal centre and the widest the asset may be. `floor` and `ceiling`
// also fix the anchor's height; the others keep the asset at the height it was drawn.
export const SLOT_BOX: Record<Slot, { cx: number; w: number; y?: number }> = {
  left: { cx: 150, w: 240 },
  centre: { cx: 400, w: 360 },
  right: { cx: 650, w: 240 },
  floor: { cx: 400, w: 520, y: 560 },
  ceiling: { cx: 400, w: 400, y: 24 },
}

export const PLACEMENT: Record<string, ParamSpec> = {
  slot: { type: 'enum', values: SLOTS, default: '' },
  atX: { type: 'number', min: 0, max: 800, default: 400 },
  atY: { type: 'number', min: 0, max: 600, default: 470 },
  scale: { type: 'number', min: 0.3, max: 3, default: 1 },
}

const flag = { type: 'flag' } as const
const text = (max = 40, d = '') => ({ type: 'text', default: d, max }) as const
const n = (min: number, max: number, d: number) => ({ type: 'number', min, max, default: d, int: true }) as const
const SIDES = ['left', 'centre', 'right'] as const
const clock = { puzzle: { type: 'puzzle' }, h: n(0, 11, 3), m: n(0, 59, 45) } as const
const face = { litFlag: flag, tiltFlag: flag, untiltFlag: flag, missingEyeFlag: flag } as const
const PROP_BOX: Rect = [-30, -30, 60, 60]
const prop = (describe: string, params: Record<string, ParamSpec> = {}): AssetMeta => ({
  kind: 'prop',
  describe,
  params,
  bbox: PROP_BOX,
  anchor: 'floor',
  slots: ['floor', ...SIDES],
  home: [400, 470],
})
const closeUp = (describe: string, params: Record<string, ParamSpec> = {}): AssetMeta => ({ kind: 'closeUp', describe, params })
// Up to three props laid out in a container close-up, each gone once its flag is set.
const contents = { prop1: { type: 'prop' }, prop1GoneFlag: flag, prop2: { type: 'prop' }, prop2GoneFlag: flag, prop3: { type: 'prop' }, prop3GoneFlag: flag } as const

export const CATALOG = {
  // Shells.
  roomShell: {
    kind: 'shell',
    describe: 'Walls, rails and plank floor of a room; first layer of every wall view.',
    params: { pattern: { type: 'enum', values: ['diamond', 'stripe', 'damask', 'plain'], default: 'diamond' } },
  },
  lighting: { kind: 'shell', describe: 'Darkness over the scene, or warm flickering light around (cx, cy) once lit.', params: { litFlag: flag, cx: n(0, 800, 400), cy: n(0, 600, 270) } },

  // The prototype room's pieces, drawn where the prototype put them.
  portrait: { kind: 'wall', describe: 'Framed painted face; eyes open when lit, head can tilt, one eye can go missing.', params: face, bbox: [105, 125, 150, 190], anchor: 'wall', slots: SIDES },
  door: {
    kind: 'wall',
    describe: 'Panelled door with a keyhole; light and feet can show under it; can stand open onto the dark.',
    params: { openFlag: flag, litFlag: flag, keyFlag: flag, feetFlag: flag, feetGoneFlag: flag },
    bbox: [322, 136, 188, 330],
    anchor: 'floor',
    slots: SIDES,
  },
  doorway: {
    kind: 'wall',
    describe: 'Plain door to another room; ajar onto the dark once open.',
    params: { x: n(0, 640, 322), openFlag: flag },
    bbox: p => [num(p, 'x', 322), 136, 188, 318],
    anchor: 'floor',
    slots: SIDES,
  },
  frame: {
    kind: 'wall',
    describe: 'Small framed panel, blank or showing one code symbol.',
    params: { x: n(0, 800, 330), y: n(0, 600, 200), w: n(40, 400, 140), h: n(40, 400, 140), symbol: { type: 'symbol', default: '' } },
    bbox: p => [num(p, 'x', 330), num(p, 'y', 200), num(p, 'w', 140), num(p, 'h', 140)],
    anchor: 'wall',
    slots: SIDES,
  },
  caseClock: {
    kind: 'wall',
    describe: 'Tall wall clock with a pendulum case; hands follow a clock puzzle; case can open.',
    params: { ...clock, woundFlag: flag, caseOpenFlag: flag, cuttersGoneFlag: flag },
    bbox: [566, 150, 90, 232],
    anchor: 'wall',
    slots: SIDES,
  },
  coatOnHook: { kind: 'wall', describe: 'Two hooks with a coat that can move to the other hook; sand can spill below.', params: { movedFlag: flag, sandFlag: flag }, bbox: [100, 158, 600, 315] },
  desk: { kind: 'wall', describe: 'Writing desk with one drawer that can stand open.', params: { drawerOpenFlag: flag }, bbox: [220, 350, 360, 124], anchor: 'floor', slots: ['centre'] },
  note: { kind: 'wall', describe: 'A slip of paper lying flat on the desk.', params: {}, bbox: [268, 337, 76, 22], anchor: 'floor' },
  candle: { kind: 'wall', describe: 'Candle on a brass dish, on the desk; flickers once lit.', params: { litFlag: flag }, bbox: [464, 264, 52, 92], anchor: 'floor' },
  rug: { kind: 'wall', describe: 'Oval rug on the floor.', params: {}, bbox: [130, 505, 540, 80], anchor: 'floor', slots: ['floor'] },
  bookshelf: { kind: 'wall', describe: 'Tall bookshelf of seeded books with one marked book leaning out.', params: { seed: n(0, 99999, 11) }, bbox: [136, 104, 288, 360], anchor: 'floor', slots: SIDES },
  birdcage: { kind: 'wall', describe: 'Hanging birdcage with a key on the perch; its door can open.', params: { keyGoneFlag: flag, openFlag: flag }, bbox: [542, 24, 116, 294], anchor: 'hang', slots: [...SIDES, 'ceiling'] },
  curtainedWindow: { kind: 'wall', describe: 'Curtained window over a ledge; once lit the glass shows fog and reflections.', params: { litFlag: flag }, bbox: [230, 90, 340, 296], anchor: 'wall', slots: SIDES },
  plantPot: { kind: 'wall', describe: 'Potted plant with a loop of string in the soil.', params: { stringGoneFlag: flag }, bbox: [164, 294, 112, 176], anchor: 'floor', slots: SIDES },

  // Furniture.
  chair: { kind: 'wall', describe: 'High-backed wooden chair; can be knocked over.', params: { toppledFlag: flag }, bbox: [340, 250, 120, 222], anchor: 'floor', slots: SIDES },
  mirror: { kind: 'wall', describe: 'Oval wall mirror; can show a figure behind you, fog up with one symbol, or crack.', params: { figureFlag: flag, fogFlag: flag, symbol: { type: 'symbol', default: '' }, crackedFlag: flag }, bbox: [330, 110, 140, 200], anchor: 'wall', slots: SIDES },
  cabinet: { kind: 'wall', describe: 'Low cabinet with two doors that can open on a dark shelf.', params: { openFlag: flag }, bbox: [300, 330, 200, 142], anchor: 'floor', slots: SIDES },
  bed: { kind: 'wall', describe: 'Narrow iron bed with a blanket; something can be under it.', params: { underFlag: flag, rumpledFlag: flag }, bbox: [220, 300, 360, 172], anchor: 'floor', slots: ['centre'] },
  wardrobe: { kind: 'wall', describe: 'Tall wardrobe; its doors can stand ajar onto the dark.', params: { openFlag: flag, eyesFlag: flag }, bbox: [310, 80, 180, 392], anchor: 'floor', slots: SIDES },
  piano: { kind: 'wall', describe: 'Upright piano; the lid can open on the keys; a candle can stand on top.', params: { lidOpenFlag: flag, litFlag: flag }, bbox: [240, 230, 320, 242], anchor: 'floor', slots: ['centre'] },
  shelf: { kind: 'wall', describe: 'Short wall shelf; a surface for props.', params: {}, bbox: [320, 270, 160, 30], anchor: 'wall', slots: SIDES },
  table: { kind: 'wall', describe: 'Small round side table; a surface for props.', params: {}, bbox: [330, 360, 140, 112], anchor: 'floor', slots: SIDES },
  wallClock: { kind: 'wall', describe: 'Round wall clock; hands follow a clock puzzle.', params: { ...clock, stoppedFlag: flag }, bbox: [340, 110, 120, 120], anchor: 'wall', slots: SIDES },
  plainWindow: { kind: 'wall', describe: 'Bare window; night outside, a moon, rain or a face at the glass.', params: { moonFlag: flag, rainFlag: flag, faceFlag: flag }, bbox: [300, 110, 200, 220], anchor: 'wall', slots: SIDES },
  trailMark: { kind: 'wall', describe: 'Small chalk mark on the wall or floor; one step of a trail puzzle.', params: { puzzle: { type: 'puzzle' }, symbol: { type: 'symbol', default: 'hand' }, doneFlag: flag }, bbox: [370, 300, 60, 60], anchor: 'wall', slots: [...SIDES, 'floor'] },

  // Props: small objects, also used as inventory icons.
  candleStub: prop('Short candle on a dish; flickers once lit.', { litFlag: flag }),
  photograph: prop('Small framed photograph of a figure.', { goneFlag: flag }),
  paperNote: prop('Folded note.', { goneFlag: flag }),
  matchbox: prop('Box of matches.', { goneFlag: flag }),
  keyRing: prop('Ring of old keys.', { goneFlag: flag }),
  musicBox: prop('Music box; the lid can open with a tiny dancer.', { openFlag: flag, goneFlag: flag }),
  jar: prop('Glass jar; can hold something dark or a symbol.', { fullFlag: flag, symbol: { type: 'symbol', default: '' }, goneFlag: flag }),
  doll: prop('Porcelain doll; its head can turn to look at you.', { turnedFlag: flag, goneFlag: flag }),
  mask: prop('Pale theatre mask.', { goneFlag: flag }),
  toy: prop('Wind-up tin soldier.', { goneFlag: flag }),
  ball: prop('Small rubber ball.', { goneFlag: flag }),
  bell: prop('Brass hand bell.', { goneFlag: flag }),

  // Close-up templates.
  clockFaceClose: closeUp('Clock face with hour and minute winding holes (clock puzzle).', { ...clock, woundFlag: flag, motto: text() }),
  portraitClose: closeUp('The portrait up close, with a plaque.', { ...face, plaque: text() }),
  drawerClosedClose: closeUp('A shut drawer with a keyhole.'),
  drawerOpenClose: closeUp('The prototype drawer, open: a photograph and a matchbox.', { matchboxGoneFlag: flag, litFlag: flag }),
  photoClose: closeUp('The prototype photograph of the room, with a caption.', { litFlag: flag, caption: text() }),
  bookClosedClose: closeUp('A closed book with a title.', { title: text(24) }),
  bookOpenClose: closeUp('The prototype book of pressed flowers, a match inside.', { matchGoneFlag: flag, leftCaption: text(), rightCaption: text() }),
  potClose: closeUp('The plant pot from above.', { stringGoneFlag: flag }),
  coatClose: closeUp('The coat up close; sand and a key below once moved.', { sandFlag: flag, keyGoneFlag: flag }),
  cageClose: closeUp('The birdcage up close, wired shut or open.', { openFlag: flag, keyGoneFlag: flag }),
  windowClose: closeUp('Window up close; once lit, fogged glass shows up to four mirrored symbols.', { litFlag: flag, symbols: { type: 'symbols', max: 4 } }),
  lockPlateClose: closeUp('Brass lock plate behind dial locks, with a keyhole and inscription.', { keyFlag: flag, inscription: text() }),
  bookSpreadClose: closeUp('Open book: each page shows a line of text, a symbol or both.', {
    leftText: text(60),
    leftSymbol: { type: 'symbol', default: '' },
    rightText: text(60),
    rightSymbol: { type: 'symbol', default: '' },
    reversedFlag: flag,
  }),
  containerClose: closeUp('Inside a drawer, box, cabinet shelf or table top, with up to three props.', {
    style: { type: 'enum', values: ['drawer', 'box', 'shelf', 'table'], default: 'drawer' },
    ...contents,
  }),
  fogGlassClose: closeUp('Glass up close; once fogged, up to four symbols drawn in it.', { fogFlag: flag, symbols: { type: 'symbols', max: 4 }, mirrored: n(0, 1, 0) }),
  noteClose: closeUp('A paper note: up to three short lines, or a row of symbols.', { line1: text(40), line2: text(40), line3: text(40), symbols: { type: 'symbols', max: 5 }, torn: n(0, 1, 0) }),
  mirrorClose: closeUp('The mirror up close: the room behind you, maybe a figure, fog with a symbol.', { figureFlag: flag, fogFlag: flag, symbol: { type: 'symbol', default: '' } }),
  panelClose: closeUp('Plain backing panel for a sequence, slider or pattern puzzle.', { style: { type: 'enum', values: ['wood', 'brass', 'paper'], default: 'wood' }, inscription: text() }),
  musicBoxClose: closeUp('The music box up close: lid, dancer and a winding key.', { openFlag: flag, playingFlag: flag, symbol: { type: 'symbol', default: '' } }),
} as const satisfies Record<string, AssetMeta>

export type AssetId = keyof typeof CATALOG
export const ASSET_IDS = Object.keys(CATALOG).filter(isAssetId)
export const PROP_IDS = ASSET_IDS.filter(id => CATALOG[id].kind === 'prop')

// Inventory icons: every prop, plus item-only drawings.
export const ICON_IDS = ['ironKey', 'brassKey', 'birdKey', 'cutters', 'match', 'litMatch', 'glassEye', ...PROP_IDS] as const

export function isAssetId(id: string): id is AssetId {
  return Object.hasOwn(CATALOG, id)
}

export function meta(id: AssetId): AssetMeta {
  return CATALOG[id]
}

function num(p: Params, key: string, fallback: number): number {
  const v = p[key]
  return typeof v === 'number' ? v : fallback
}

export function bboxOf(m: AssetMeta, p: Params): Rect | null {
  if (!m.bbox) return null
  return typeof m.bbox === 'function' ? m.bbox(p) : m.bbox
}

// How a placed asset is drawn: scale `s` about its own anchor point, moved to `(x, y)`.
export type Placement = { s: number; dx: number; dy: number }

export function placement(m: AssetMeta, p: Params): Placement | null {
  const box = bboxOf(m, p)
  if (!box || (m.kind !== 'wall' && m.kind !== 'prop')) return null
  const [bx, by, bw, bh] = box
  const ax = bx + bw / 2
  const ay = m.anchor === 'hang' ? by : m.anchor === 'wall' ? by + bh / 2 : by + bh
  const slot = isSlot(p['slot']) ? SLOT_BOX[p['slot']] : undefined
  const scale = num(p, 'scale', 1)
  let x: number
  let y: number
  let s = scale
  if (slot) {
    x = slot.cx
    y = slot.y ?? m.home?.[1] ?? ay
    s = Math.min(1, slot.w / bw) * scale
  } else if (typeof p['atX'] === 'number' || typeof p['atY'] === 'number') {
    x = num(p, 'atX', ax)
    y = num(p, 'atY', ay)
  } else if (m.home) {
    ;[x, y] = m.home
  } else if (scale !== 1) {
    ;[x, y] = [ax, ay]
  } else {
    return null
  }
  return { s, dx: x - ax * s, dy: y - ay * s }
}

// Where an asset ends up in the scene: its bbox after placement. The generator lays out
// rooms and derives hotspot rects from this.
export function placedRect(id: AssetId, p: Params): Rect | null {
  const m = meta(id)
  const box = bboxOf(m, p)
  if (!box) return null
  const at = placement(m, p)
  if (!at) return box
  const [x, y, w, h] = box
  return [x * at.s + at.dx, y * at.s + at.dy, w * at.s, h * at.s]
}

// Problems with one layer's params, as short codes for the validator (never content).
export function paramProblems(id: AssetId, p: Params): string[] {
  const m = meta(id)
  const specs: Record<string, ParamSpec> = m.kind === 'wall' || m.kind === 'prop' ? { ...PLACEMENT, ...m.params } : m.params
  const problems: string[] = []
  for (const [key, value] of Object.entries(p)) {
    const spec = specs[key]
    if (!spec) {
      problems.push(`param:${key}`)
      continue
    }
    if (!fits(spec, value)) problems.push(`value:${key}`)
  }
  const slot = p['slot']
  if (slot !== undefined && !(isSlot(slot) && (m.slots ?? []).includes(slot))) problems.push('slot')
  return problems
}

const isSymbol = (s: string) => (SYMBOLS as readonly string[]).includes(s)

function fits(spec: ParamSpec, value: number | string): boolean {
  switch (spec.type) {
    case 'flag':
    case 'puzzle':
      return typeof value === 'string' && value.length > 0
    case 'number':
      return typeof value === 'number' && value >= spec.min && value <= spec.max && (!spec.int || Number.isInteger(value))
    case 'text':
      return typeof value === 'string' && value.length <= spec.max
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value)
    case 'symbol':
      return typeof value === 'string' && (value === '' || isSymbol(value))
    case 'symbols': {
      if (typeof value !== 'string') return false
      const list = value.split(',').filter(Boolean)
      return list.length <= spec.max && list.every(isSymbol)
    }
    case 'prop':
      return typeof value === 'string' && (PROP_IDS as string[]).includes(value)
  }
}
