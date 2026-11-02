// The level format. This schema is the single source of truth: the engine, validator and
// generator all use the types inferred from it. Cross-references (ids that must exist) are
// checked separately in refs.ts.
import * as v from 'valibot'
import { PALETTE_TOKENS } from '../catalog/assets.ts'

export const WALLS = ['n', 'e', 's', 'w'] as const
export type Wall = (typeof WALLS)[number]

export const SFX = [
  'turn', 'pick', 'click', 'wrong', 'page', 'unlock', 'strike', 'sand', 'chime', 'knock', 'steps',
  'whisper', 'musicbox', 'eerie', 'sting', 'tick',
] as const

export const MESSAGE_MAX = 140

export const Id = v.pipe(v.string(), v.regex(/^[a-z][\w-]*$/i, 'id'))
// Close-ups are addressed by their key; walls by `<roomId>/<wall>`.
export const ViewId = v.pipe(v.string(), v.regex(/^[a-z][\w-]*(\/[nesw])?$/i, 'view id'))
const FlagName = v.pipe(v.string(), v.minLength(1))
const FlagValue = v.union([v.boolean(), v.number(), v.string()])
const Text = v.pipe(v.string(), v.minLength(1))
const Message = v.pipe(Text, v.maxLength(MESSAGE_MAX))
const Wall = v.picklist(WALLS)
const Int = (min: number, max: number) => v.pipe(v.number(), v.integer(), v.minValue(min), v.maxValue(max))

export type FlagValue = v.InferOutput<typeof FlagValue>

export type Cond =
  | { op: 'flag'; flag: string; eq?: FlagValue | undefined }
  | { op: 'has'; item: string }
  | { op: 'selected'; item: string }
  | { op: 'seen'; view: string }
  | { op: 'fired'; id: string }
  | { op: 'not'; cond: Cond }
  | { op: 'all'; conds: Cond[] }
  | { op: 'any'; conds: Cond[] }

export const Cond: v.GenericSchema<Cond> = v.lazy(() =>
  v.variant('op', [
    v.strictObject({ op: v.literal('flag'), flag: FlagName, eq: v.optional(FlagValue) }),
    v.strictObject({ op: v.literal('has'), item: Id }),
    v.strictObject({ op: v.literal('selected'), item: Id }),
    v.strictObject({ op: v.literal('seen'), view: ViewId }),
    v.strictObject({ op: v.literal('fired'), id: Id }),
    v.strictObject({ op: v.literal('not'), cond: Cond }),
    v.strictObject({ op: v.literal('all'), conds: v.array(Cond) }),
    v.strictObject({ op: v.literal('any'), conds: v.array(Cond) }),
  ]),
)

export const Effect = v.variant('do', [
  v.strictObject({ do: v.literal('say'), text: Message }),
  v.strictObject({ do: v.literal('give'), item: Id }),
  v.strictObject({ do: v.literal('take'), item: Id }),
  v.strictObject({ do: v.literal('setFlag'), flag: FlagName, value: FlagValue }),
  v.strictObject({ do: v.literal('open'), view: Id }),
  v.strictObject({ do: v.literal('goto'), room: Id, wall: v.optional(Wall) }),
  v.strictObject({ do: v.literal('sound'), sfx: v.picklist(SFX) }),
  v.strictObject({ do: v.literal('beat'), id: Id }),
  v.strictObject({ do: v.literal('endChapter') }),
])
export type Effect = v.InferOutput<typeof Effect>

const Effects = v.array(Effect)

const Rule = v.strictObject({ when: v.optional(Cond), do: Effects })

export const Hotspot = v.strictObject({
  id: Id,
  // x, y, w, h in the 800×600 scene.
  rect: v.tuple([v.number(), v.number(), v.number(), v.number()]),
  accepts: v.optional(v.array(Id)),
  looksLikeClue: v.optional(v.boolean()),
  // Absent (not drawn, not tappable) while this is false.
  visibleWhen: v.optional(Cond),
  rules: v.array(Rule),
})
export type Hotspot = v.InferOutput<typeof Hotspot>

// ── A level's own art ────────────────────────────────────────────────────────────────────────
// Shapes are a closed vocabulary drawn by src/art/levelArt.ts, so a level can bring new drawings
// without code (and without raw SVG). Colours name a palette token, a fixed colour or a hex.
export const FIXED_PAINTS = ['ink', 'paper', 'brass', 'flame', 'glass', 'beyond', 'shadow', 'none'] as const
export const ANIMS = ['flicker', 'sway', 'breathe', 'drift'] as const
const Num = v.pipe(v.number(), v.finite())
const Hex = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i, 'hex colour'))
const Paint = v.union([v.picklist([...PALETTE_TOKENS, ...FIXED_PAINTS]), Hex])
const PathData = v.pipe(v.string(), v.regex(/^[MLHVCSQTAZmlhvcsqtaz\d\s,.eE-]+$/, 'path data'), v.maxLength(4000))
export const ART_TEXT_MAX = 40

type Style = {
  fill?: string | undefined
  stroke?: string | undefined
  width?: number | undefined
  opacity?: number | undefined
  // Drawn only while this flag is set / unset.
  if?: string | undefined
  unless?: string | undefined
  anim?: (typeof ANIMS)[number] | undefined
}
export type Shape = Style &
  (
    | { el: 'rect'; x: number; y: number; w: number; h: number; r?: number | undefined }
    | { el: 'circle'; cx: number; cy: number; r: number }
    | { el: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
    | { el: 'line'; x1: number; y1: number; x2: number; y2: number }
    | { el: 'poly'; points: number[]; open?: boolean | undefined }
    | { el: 'path'; d: string }
    | { el: 'text'; x: number; y: number; text: string; size?: number | undefined; italic?: boolean | undefined }
    | { el: 'group'; x?: number | undefined; y?: number | undefined; scale?: number | undefined; rotate?: number | undefined; shapes: Shape[] }
    // Another asset (catalog or this level's) drawn here, for composing pieces.
    | { el: 'use'; asset: string; params?: Record<string, number | string> | undefined; x?: number | undefined; y?: number | undefined; scale?: number | undefined }
  )

const style = {
  fill: v.optional(Paint),
  stroke: v.optional(Paint),
  width: v.optional(v.pipe(Num, v.minValue(0), v.maxValue(60))),
  opacity: v.optional(v.pipe(Num, v.minValue(0), v.maxValue(1))),
  if: v.optional(FlagName),
  unless: v.optional(FlagName),
  anim: v.optional(v.picklist(ANIMS)),
}
const Size = v.pipe(Num, v.minValue(0))

export const Shape: v.GenericSchema<Shape> = v.lazy(() =>
  v.variant('el', [
    v.strictObject({ ...style, el: v.literal('rect'), x: Num, y: Num, w: Size, h: Size, r: v.optional(Size) }),
    v.strictObject({ ...style, el: v.literal('circle'), cx: Num, cy: Num, r: Size }),
    v.strictObject({ ...style, el: v.literal('ellipse'), cx: Num, cy: Num, rx: Size, ry: Size }),
    v.strictObject({ ...style, el: v.literal('line'), x1: Num, y1: Num, x2: Num, y2: Num }),
    v.strictObject({ ...style, el: v.literal('poly'), points: v.pipe(v.array(Num), v.minLength(4), v.check(p => p.length % 2 === 0, 'pairs')), open: v.optional(v.boolean()) }),
    v.strictObject({ ...style, el: v.literal('path'), d: PathData }),
    v.strictObject({ ...style, el: v.literal('text'), x: Num, y: Num, text: v.pipe(Text, v.maxLength(ART_TEXT_MAX)), size: v.optional(v.pipe(Num, v.minValue(6), v.maxValue(120))), italic: v.optional(v.boolean()) }),
    v.strictObject({ ...style, el: v.literal('group'), x: v.optional(Num), y: v.optional(Num), scale: v.optional(v.pipe(Num, v.minValue(0.05), v.maxValue(10))), rotate: v.optional(Num), shapes: v.array(Shape) }),
    v.strictObject({ ...style, el: v.literal('use'), asset: Id, params: v.optional(v.record(v.string(), v.union([v.number(), v.string()]))), x: v.optional(Num), y: v.optional(Num), scale: v.optional(v.pipe(Num, v.minValue(0.05), v.maxValue(10))) }),
  ]),
)

export const ArtAsset = v.strictObject({
  kind: v.picklist(['shell', 'wall', 'prop', 'closeUp']),
  // Where the drawing sits (wall pieces; props default to the 60×60 box round the origin).
  bbox: v.optional(v.tuple([Num, Num, Size, Size])),
  anchor: v.optional(v.picklist(['floor', 'wall', 'hang'])),
  // Pure set dressing: drawn quieter than everything you can use, and never under a hotspot.
  decor: v.optional(v.boolean()),
  shapes: v.pipe(v.array(Shape), v.minLength(1)),
})
export type ArtAsset = v.InferOutput<typeof ArtAsset>

// A catalog palette, or one with its own colours laid over a catalog base.
const LevelPalette = v.union([Id, v.strictObject({ base: Id, colours: v.record(v.picklist(PALETTE_TOKENS), Hex) })])
export type LevelPalette = v.InferOutput<typeof LevelPalette>

const Layer = v.strictObject({
  id: v.optional(Id),
  asset: Id,
  params: v.optional(v.record(v.string(), v.union([v.number(), v.string()]))),
  visibleWhen: v.optional(Cond),
})

export const View = v.strictObject({
  layers: v.array(Layer),
  hotspots: v.array(Hotspot),
  puzzle: v.optional(Id),
})
export type View = v.InferOutput<typeof View>

const Room = v.strictObject({
  id: Id,
  walls: v.strictObject({ n: View, e: View, s: View, w: View }),
  closeUps: v.record(Id, View),
  // Looping background sounds, e.g. a clock ticking once it has been wound.
  ambient: v.optional(v.array(v.strictObject({ sfx: v.picklist(SFX), everyMs: Int(200, 60000), when: v.optional(Cond) }))),
})
export type Room = v.InferOutput<typeof Room>

// Puzzle widgets are a closed library; each declares its solution so the solver can check it.
// `clues` lists the views whose contents are needed to work out the answer.
// `activeWhen` gates input (a clock that must be wound first); `inactiveSay` explains why.
const puzzleBase = {
  id: Id,
  clues: v.array(ViewId),
  activeWhen: v.optional(Cond),
  inactiveSay: v.optional(Message),
  onSolve: Effects,
}
const Bits = v.pipe(v.string(), v.regex(/^[01]+$/))
const Time = v.strictObject({ h: Int(0, 11), m: Int(0, 59) })

export const Puzzle = v.variant('kind', [
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('dialLock'),
    symbols: v.pipe(v.array(Id), v.minLength(2)),
    initial: v.array(Id),
    solution: v.pipe(v.array(Id), v.minLength(1)),
  }),
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('clockSet'),
    initial: Time,
    solution: Time,
    minuteStep: Int(1, 30),
  }),
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('sequence'),
    targets: v.pipe(v.array(Id), v.minLength(2)),
    solution: v.pipe(v.array(Id), v.minLength(2)),
  }),
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('slider'),
    size: Int(2, 4),
    // Row-major tiles, 0 is the gap.
    initial: v.array(Int(0, 15)),
    solution: v.array(Int(0, 15)),
  }),
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('pattern'),
    rows: Int(2, 5),
    cols: Int(2, 5),
    // Row-major cells, 1 is lit. `cross` also toggles the four neighbours.
    initial: Bits,
    solution: Bits,
    mode: v.picklist(['single', 'cross']),
  }),
  v.strictObject({
    ...puzzleBase,
    kind: v.literal('trail'),
    trail: v.pipe(v.array(ViewId), v.minLength(2)),
  }),
])
export type Puzzle = v.InferOutput<typeof Puzzle>

const Trigger = v.variant('type', [
  // Right after this flag changes value, in view.
  v.strictObject({ type: v.literal('afterFlag'), flag: FlagName, when: v.optional(Cond) }),
  // On arriving at a view while `when` holds.
  v.strictObject({ type: v.literal('arrive'), view: ViewId, when: v.optional(Cond) }),
  // On leaving a view while `when` holds; the change is seen on return.
  v.strictObject({ type: v.literal('leave'), view: ViewId, when: v.optional(Cond) }),
])

const Beat = v.strictObject({
  id: Id,
  on: Trigger,
  once: v.literal(true),
  do: Effects,
})
export type Beat = v.InferOutput<typeof Beat>

const Objective = v.strictObject({
  id: Id,
  availableWhen: v.optional(Cond),
  doneWhen: Cond,
  hints: v.tuple([Message, Message, Message]),
})
export type Objective = v.InferOutput<typeof Objective>

const Chapter = v.strictObject({
  id: Id,
  intro: Text,
  // The small payoff shown on the card when the chapter ends (the ending covers the last one).
  outro: v.optional(Message),
  start: v.strictObject({ room: Id, wall: Wall }),
  rooms: v.pipe(v.array(Room), v.minLength(1)),
  puzzles: v.array(Puzzle),
  beats: v.array(Beat),
  objectives: v.array(Objective),
  exitWhen: Cond,
})
export type Chapter = v.InferOutput<typeof Chapter>

const Item = v.strictObject({ name: Text, desc: Message, icon: Id })

// 2 added the level's own art and the rules that keep objects alive (SILENT_TAP, DEAD_PROP,
// DECOR_TAP, NOVELTY). Levels written before keep 1 and aren't held to those rules.
export const SCHEMA_VERSION = 2

export const Level = v.strictObject({
  id: Id,
  schema: v.union([v.literal(1), v.literal(2)]),
  title: Text,
  theme: Text,
  palette: LevelPalette,
  art: v.optional(v.record(Id, ArtAsset)),
  items: v.record(Id, Item),
  combos: v.array(v.strictObject({ a: Id, b: Id, make: Id, say: Message })),
  chapters: v.tuple([Chapter, Chapter, Chapter]),
  secrets: v.array(
    v.strictObject({ id: Id, foundWhen: Cond, tell: v.strictObject({ view: ViewId, layer: Id }) }),
  ),
  endings: v.pipe(
    v.array(v.strictObject({ id: Id, when: v.optional(Cond), text: Text })),
    v.minLength(1),
  ),
})
export type Level = v.InferOutput<typeof Level>

export type ParseIssue = { path: string; code: string }
export type ParseResult = { ok: true; level: Level } | { ok: false; issues: ParseIssue[] }

// Spoiler-free parse: issues carry only the path (ids) and the failed check, never values.
export function parseLevel(input: unknown): ParseResult {
  const result = v.safeParse(Level, input)
  if (result.success) return { ok: true, level: result.output }
  return {
    ok: false,
    issues: result.issues.map(issue => ({ path: v.getDotPath(issue) ?? '', code: issue.type })),
  }
}
