// The level format. This schema is the single source of truth: the engine, validator and
// generator all use the types inferred from it. Cross-references (ids that must exist) are
// checked separately in refs.ts.
import * as v from 'valibot'
import { DOG_ACTS, DOG_ROLES } from './dog.ts'

export const WALLS = ['n', 'e', 's', 'w'] as const
export type Wall = (typeof WALLS)[number]

export const SFX = [
  'turn', 'pick', 'click', 'wrong', 'page', 'unlock', 'strike', 'sand', 'chime', 'knock', 'steps',
  'whisper', 'musicbox', 'eerie', 'sting', 'tick',
  'happyBark', 'sniffing', 'panting', 'tailThump', 'growl',
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
const DogAct = v.picklist(DOG_ACTS)
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
  v.strictObject({ do: v.literal('dog'), act: DogAct }),
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
  rules: v.array(Rule),
})
export type Hotspot = v.InferOutput<typeof Hotspot>

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
})
export type Room = v.InferOutput<typeof Room>

// Puzzle widgets are a closed library; each declares its solution so the solver can check it.
// `clues` lists the views whose contents are needed to work out the answer.
const puzzleBase = { id: Id, clues: v.array(ViewId), onSolve: Effects }
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
    kind: v.literal('scent'),
    trail: v.pipe(v.array(ViewId), v.minLength(2)),
  }),
])
export type Puzzle = v.InferOutput<typeof Puzzle>

const Trigger = v.variant('type', [
  // Right after this flag changes value, in view.
  v.strictObject({ type: v.literal('afterFlag'), flag: FlagName }),
  // On arriving at a view while `when` holds.
  v.strictObject({ type: v.literal('arrive'), view: ViewId, when: v.optional(Cond) }),
  // On leaving a view while `when` holds; the change is seen on return.
  v.strictObject({ type: v.literal('leave'), view: ViewId, when: v.optional(Cond) }),
])

const Beat = v.strictObject({
  id: Id,
  on: Trigger,
  once: v.literal(true),
  threat: v.optional(v.boolean()),
  do: Effects,
  dogResponse: v.optional(DogAct),
})
export type Beat = v.InferOutput<typeof Beat>

const DogMoment = v.strictObject({
  id: Id,
  role: v.picklist(DOG_ROLES),
  // A hotspot (send the dog there) or an item (let the dog sniff it).
  at: Id,
  when: v.optional(Cond),
  do: Effects,
})
export type DogMoment = v.InferOutput<typeof DogMoment>

const Objective = v.strictObject({
  id: Id,
  availableWhen: v.optional(Cond),
  doneWhen: Cond,
  hints: v.tuple([Message, Message, Message]),
  dogPoints: ViewId,
})
export type Objective = v.InferOutput<typeof Objective>

const Chapter = v.strictObject({
  id: Id,
  intro: Text,
  start: v.strictObject({ room: Id, wall: Wall }),
  rooms: v.pipe(v.array(Room), v.minLength(1)),
  puzzles: v.array(Puzzle),
  beats: v.array(Beat),
  objectives: v.array(Objective),
  dogMoments: v.array(DogMoment),
  exitWhen: Cond,
})
export type Chapter = v.InferOutput<typeof Chapter>

const Item = v.strictObject({ name: Text, desc: Message, icon: Id })

export const Level = v.strictObject({
  id: Id,
  schema: v.literal(1),
  title: Text,
  theme: Text,
  palette: Id,
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
