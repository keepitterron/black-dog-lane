// Tools for authoring real levels with the /new-level skill. Drafts are plain Level JSON in the
// git-ignored .gen/ folder; this script checks them, packs them into encoded levels/play files
// and opens the level PR. Output is spoiler-free: counts, codes and ids, never level text.
//
//   npm run level -- catalog          what a level may use: assets, params, slots, widgets, own art
//   npm run level -- usage            what earlier levels already used, to steer away from it
//   npm run level -- check <draft>    resolve the draft and run the strict validator
//   npm run level -- pack <draft>     check, encode to levels/play/<id>.level, delete the draft
//                                     (--replace overwrites an existing level, for fixes)
//   npm run level -- unpack <id>      decode a real level into .gen/<id>.json, for fixes
//   npm run level -- pr <id>          commit only that file on its own branch and open the PR
//
// Draft sugar: a hotspot may give `on: "<layerId>"` instead of `rect`; the rect becomes the
// placed bbox of that layer in the same view, so drafts never need coordinates for wall pieces.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as v from 'valibot'
import {
  ASSET_IDS,
  CATALOG,
  ICON_IDS,
  isAssetId,
  PALETTE_IDS,
  PALETTE_TOKENS,
  PLACEMENT,
  SLOT_BOX,
  SYMBOLS,
  placedRect,
  type Params,
  type ParamSpec,
} from '../src/catalog/assets.ts'
import { decodeLevel, encodeLevel } from '../src/engine/codec.ts'
import { MIN_TAP_UNITS, SCENE_H, SCENE_W } from '../src/engine/layout.ts'
import { ANIMS, ArtAsset, ART_TEXT_MAX, FIXED_PAINTS, MESSAGE_MAX, parseLevel, SCHEMA_VERSION, SFX, WALLS, type Level } from '../src/engine/schema.ts'
import { ART_SHAPES_MAX, validate } from '../src/solver/validate.ts'
import { reportLines, type Report } from './lib/report.ts'

type Finding = Report['codes'][number]

// ── catalog ──────────────────────────────────────────────────────────────────────────────────

function paramText(name: string, spec: ParamSpec): string {
  switch (spec.type) {
    case 'flag':
      return `${name}:flag`
    case 'number':
      return `${name}:${spec.int ? 'int' : 'num'} ${spec.min}–${spec.max} (${spec.default})`
    case 'text':
      return `${name}:text ≤${spec.max}`
    case 'enum':
      return `${name}:${spec.values.filter(Boolean).join('|')}`
    case 'symbol':
      return `${name}:symbol`
    case 'symbols':
      return `${name}:symbols ≤${spec.max} comma-separated`
    case 'puzzle':
      return `${name}:puzzle id`
    case 'prop':
      return `${name}:prop id`
  }
}

const PUZZLES = [
  'dialLock   symbols (≥2 symbol ids), initial and solution (one symbol per dial, same length)',
  'clockSet   initial and solution {h 0–11, m 0–59}, minuteStep 1–30',
  'sequence   targets (≥2 symbol or prop ids), solution (the order to tap them, ≥2)',
  'slider     size 2–4, initial and solution: row-major tiles 1..n with 0 as the gap; must be reachable',
  'pattern    rows and cols 2–5, initial and solution: row-major 0/1 strings; mode single|cross (cross also flips the 4 neighbours)',
  'trail      trail: wall view ids in order (≥2); each of those walls needs a trailMark layer whose puzzle param names it',
]

const OWN_ART = [
  `## own art  level.art: { "<a01>": { kind, bbox?, anchor?, decor?, shapes } }; layers name it like a catalog asset`,
  '  kind shell|wall|prop|closeUp. wall needs bbox [x,y,w,h] in scene units; prop draws round the origin in a 60×60 box and can be an item icon, a sequence target or a container prop',
  '  anchor floor|wall|hang (default floor); placed with slot (any) or atX/atY, plus scale, like catalog pieces',
  '  decor: true draws it quieter and it must never sit under a hotspot (DECOR_TAP)',
  '  shapes (all take fill, stroke, width, opacity, if:<flag>, unless:<flag>, anim):',
  '    rect x y w h r? · circle cx cy r · ellipse cx cy rx ry · line x1 y1 x2 y2 · poly points[x,y,…] open?',
  `    path d (M L H V C S Q T A Z only) · text x y text(≤${ART_TEXT_MAX}) size? italic? · group x? y? scale? rotate? shapes`,
  '    use asset params? x? y? scale?  (a catalog or own asset nested; no loops)',
  `  colours: palette tokens ${PALETTE_TOKENS.join(' ')}; fixed ${FIXED_PAINTS.join(' ')}; or #rrggbb`,
  `  anim ${ANIMS.join(' ')} (off for reduced motion) · at most ${ART_SHAPES_MAX} shapes per piece`,
  `## own palette  palette: "<catalog id>" or { "base": "<catalog id>", "colours": { "<token>": "#rrggbb" } }`,
  `## schema  drafts use schema ${SCHEMA_VERSION}`,
]

export function catalogText(): string {
  const out: string[] = []
  const placeable = Object.entries(PLACEMENT).map(([k, s]) => paramText(k, s)).join('  ')
  for (const kind of ['shell', 'wall', 'prop', 'closeUp'] as const) {
    out.push(`## ${kind}`)
    for (const id of ASSET_IDS.filter(a => CATALOG[a].kind === kind)) {
      const m = CATALOG[id]
      const params = Object.entries(m.params).map(([k, s]) => paramText(k, s))
      const slots = 'slots' in m ? `  slots ${m.slots.join('|')}` : ''
      const box = 'bbox' in m && Array.isArray(m.bbox) ? `  bbox ${m.bbox.join(',')}` : ''
      out.push(`${id}${slots}${box}`, `  ${m.describe}`)
      if (params.length) out.push(`  params ${params.join('  ')}`)
    }
    out.push('')
  }
  out.push(
    '## placement (wall pieces and props)',
    `  ${placeable}`,
    `  slot boxes: ${Object.entries(SLOT_BOX).map(([s, b]) => `${s} cx ${b.cx} w ${b.w}${b.y === undefined ? '' : ` y ${b.y}`}`).join('; ')}`,
    '  without slot or atX/atY a piece draws at its bbox as listed',
    '',
    '## puzzles (widgets; a close-up with `puzzle: <id>` hosts it, except trail)',
    ...PUZZLES.map(p => `  ${p}`),
    '  all: id, clues (view ids needed to work out the answer), activeWhen?, inactiveSay?, onSolve effects',
    '',
    `## palettes  ${PALETTE_IDS.join(' ')}`,
    `## icons  ${ICON_IDS.join(' ')}`,
    `## symbols  ${SYMBOLS.join(' ')}`,
    `## sfx  ${SFX.join(' ')}`,
    `## scene  ${SCENE_W}×${SCENE_H}; walls ${WALLS.join(' ')} with view ids <room>/<wall>; hotspots padded to ${MIN_TAP_UNITS} units; messages ≤${MESSAGE_MAX} chars`,
    '## draft sugar  a hotspot may give on: "<layerId>" instead of rect (wall pieces and props, catalog or own)',
    '',
    ...OWN_ART,
  )
  return out.join('\n')
}

// ── drafts ───────────────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x)
const records = (x: unknown): Json[] => (Array.isArray(x) ? x.filter(isRecord) : [])
const isParams = (x: unknown): x is Params => isRecord(x) && Object.values(x).every(value => typeof value === 'number' || typeof value === 'string')

function resolveView(viewId: string, view: unknown, problems: Finding[], art: Level['art']) {
  if (!isRecord(view)) return
  const layers = records(view['layers'])
  for (const hotspot of records(view['hotspots'])) {
    const on = hotspot['on']
    if (on === undefined) continue
    delete hotspot['on']
    const layer = layers.find(l => l['id'] === on)
    const asset = layer?.['asset']
    const params = layer?.['params'] ?? {}
    const rect = typeof asset === 'string' && isParams(params) ? placedRect(asset, params, art) : null
    if (!rect || 'rect' in hotspot) {
      problems.push({ code: 'DRAFT_ON', ids: [viewId, String(hotspot['id'])] })
      continue
    }
    hotspot['rect'] = rect.map(Math.round)
  }
}

// Turns a draft into level JSON (in place) and reports hotspots whose `on` can't be resolved.
export function resolveDraft(draft: unknown): Finding[] {
  const problems: Finding[] = []
  if (!isRecord(draft)) return problems
  if (draft['schema'] !== SCHEMA_VERSION) problems.push({ code: 'SCHEMA', ids: ['schema'] })
  // Only well-formed own art can say where it stands; the validator reports the rest.
  const parsedArt = v.safeParse(v.record(v.string(), ArtAsset), draft['art'])
  const art = parsedArt.success ? parsedArt.output : undefined
  for (const chapter of records(draft['chapters'])) {
    for (const room of records(chapter['rooms'])) {
      const walls = room['walls']
      if (isRecord(walls)) for (const wall of WALLS) resolveView(`${String(room['id'])}/${wall}`, walls[wall], problems, art)
      const closeUps = room['closeUps']
      if (isRecord(closeUps)) for (const [id, view] of Object.entries(closeUps)) resolveView(id, view, problems, art)
    }
  }
  return problems
}

const BAD_JSON: Report = { ok: false, codes: [{ code: 'CORRUPT', ids: [] }], stats: null }

export function checkDraft(file: string): { report: Report; level: unknown } {
  let draft: unknown
  try {
    draft = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return { report: BAD_JSON, level: null }
  }
  const problems = resolveDraft(draft)
  if (problems.length) return { report: { ok: false, codes: problems, stats: null }, level: draft }
  return { report: validate(draft, { profile: 'play' }), level: draft }
}

// Packs a clean draft into `<outDir>/<id>.level` and deletes the draft. Returns the file
// written, or null (with the report) when the draft fails or the level already exists and
// `replace` (used for fixes to a real level) isn't set.
export async function pack(file: string, { outDir = 'levels/play', replace = false } = {}): Promise<{ report: Report; out: string | null }> {
  const { report, level } = checkDraft(file)
  if (!report.ok) return { report, out: null }
  const parsed = parseLevel(level)
  if (!parsed.ok) return { report: BAD_JSON, out: null }
  const out = join(outDir, `${parsed.level.id}.level`)
  if (existsSync(out) && !replace) return { report: { ok: false, codes: [{ code: 'EXISTS', ids: [parsed.level.id] }], stats: report.stats }, out: null }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(out, `${await encodeLevel(parsed.level)}\n`)
  unlinkSync(file)
  return { report, out }
}

// Decodes a real level back into a draft for a fix. Only the script touches the level file.
export async function unpack(id: string, { playDir = 'levels/play', draftDir = '.gen' } = {}): Promise<string> {
  const decoded = await decodeLevel(readFileSync(join(playDir, `${id}.level`), 'utf8'))
  if (!decoded.ok) throw new Error(`${id} does not decode`)
  mkdirSync(draftDir, { recursive: true })
  const file = join(draftDir, `${id}.json`)
  writeFileSync(file, `${JSON.stringify(decoded.level, null, 2)}\n`)
  return file
}

// ── usage ────────────────────────────────────────────────────────────────────────────────────

// How often earlier levels (real ones and the test fixtures) used each catalog asset, puzzle
// kind and palette, so a new level can reach for what hasn't been seen. Catalog ids and counts
// only: a level's own art and text never show.
const filesIn = (dir: string, ext: string) => (existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(ext)).map(f => join(dir, f)) : [])
const count = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)
const countLine = (map: Map<string, number>) => [...map].toSorted((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('  ')

export async function usage({ playDir = 'levels/play', testDir = 'levels/test' } = {}): Promise<string> {
  const levels: Level[] = []
  for (const file of filesIn(playDir, '.level')) {
    const decoded = await decodeLevel(readFileSync(file, 'utf8'))
    if (decoded.ok) levels.push(decoded.level)
  }
  for (const file of filesIn(testDir, '.json')) {
    const parsed = parseLevel(JSON.parse(readFileSync(file, 'utf8')))
    if (parsed.ok) levels.push(parsed.level)
  }
  const assets = new Map<string, number>()
  const puzzles = new Map<string, number>()
  const palettes = new Map<string, number>()
  for (const level of levels) {
    count(palettes, typeof level.palette === 'string' ? level.palette : level.palette.base)
    const used = new Set<string>()
    for (const ch of level.chapters) {
      for (const p of ch.puzzles) count(puzzles, p.kind)
      for (const room of ch.rooms)
        for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)]) for (const layer of view.layers) if (isAssetId(layer.asset)) used.add(layer.asset)
    }
    for (const id of used) count(assets, id)
  }
  const unused = ASSET_IDS.filter(id => !assets.has(id))
  return [
    `${levels.length} levels`,
    `assets (levels using each)  ${countLine(assets)}`,
    `assets never used  ${unused.join(' ') || '-'}`,
    `puzzles (instances)  ${countLine(puzzles)}`,
    `palettes  ${countLine(palettes)}`,
  ].join('\n')
}

// ── pull request ─────────────────────────────────────────────────────────────────────────────

const run = (cwd: string, cmd: string, args: string[]) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

function hasGh(cwd: string): boolean {
  try {
    run(cwd, 'gh', ['--version'])
    return true
  } catch {
    return false
  }
}

// Commits only levels/play/<id>.level on a fresh branch cut from <remote>/<base>, pushes it and
// opens the PR with the validator report as its body, then returns to the original branch. A
// level that is already on <base> goes up as an update on its own branch.
export async function openPr(id: string, { cwd = process.cwd(), remote = 'origin', base = 'main', now = new Date() } = {}): Promise<string> {
  const file = `levels/play/${id}.level`
  const text = readFileSync(join(cwd, file), 'utf8')
  const decoded = await decodeLevel(text)
  if (!decoded.ok) throw new Error(`${file} does not decode`)
  const report = validate(decoded.level, { profile: 'play' })
  if (!report.ok) throw new Error(`${file} fails validation`)

  // NUL-separated `XY path` entries; not trimmed, since a status of ` M` starts with a space.
  const status = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const dirty = status.split('\0').filter(entry => entry && entry.slice(3) !== file)
  if (dirty.length) throw new Error('working tree is not clean (besides the level file)')

  run(cwd, 'git', ['fetch', remote, base])
  const update = onBranch(cwd, `${remote}/${base}`, file)
  const stamp = now.toISOString().replaceAll(/\D/g, '').slice(0, 12)
  const branch = update ? `level/${id}-${stamp}` : `level/${id}`
  const [verb, noun] = update ? ['Update', 'update'] : ['Add', 'new']

  // Park the level outside the tree so the switch can't trip over it; put it back on failure.
  const tracked = onBranch(cwd, 'HEAD', file)
  if (tracked) run(cwd, 'git', ['checkout', '--', file])
  else unlinkSync(join(cwd, file))
  const original = run(cwd, 'git', ['branch', '--show-current'])
  try {
    run(cwd, 'git', ['switch', '-c', branch, `${remote}/${base}`])
  } catch (error) {
    writeFileSync(join(cwd, file), text)
    throw error
  }
  try {
    mkdirSync(join(cwd, 'levels/play'), { recursive: true })
    writeFileSync(join(cwd, file), text)
    run(cwd, 'git', ['add', '--', file])
    run(cwd, 'git', ['commit', '-m', `${verb} level ${id}`, '--', file])
    run(cwd, 'git', ['push', '-u', remote, branch])
    if (!hasGh(cwd)) return `pushed ${branch} (${noun} level); gh not found, open the PR by hand`
    const body = ['```', ...reportLines(file, report), '```'].join('\n')
    return run(cwd, 'gh', ['pr', 'create', '--base', base, '--head', branch, '--title', `${verb} level: ${decoded.level.title}`, '--body', body])
  } finally {
    run(cwd, 'git', ['switch', original])
  }
}

function onBranch(cwd: string, ref: string, file: string): boolean {
  try {
    run(cwd, 'git', ['cat-file', '-e', `${ref}:${file}`])
    return true
  } catch {
    return false
  }
}

// ── cli ──────────────────────────────────────────────────────────────────────────────────────

function print(name: string, report: Report) {
  for (const line of reportLines(name, report)) console.log(line)
  if (!report.ok) process.exitCode = 1
}

if (import.meta.main) {
  const [cmd, arg] = process.argv.slice(2)
  if (cmd === 'catalog') {
    console.log(catalogText())
  } else if (cmd === 'usage') {
    console.log(await usage())
  } else if (cmd === 'check' && arg) {
    print(arg, checkDraft(arg).report)
  } else if (cmd === 'pack' && arg) {
    const { report, out } = await pack(arg, { replace: process.argv.includes('--replace') })
    print(out ?? arg, report)
  } else if (cmd === 'unpack' && arg) {
    console.log(await unpack(arg))
  } else if (cmd === 'pr' && arg) {
    try {
      console.log(await openPr(arg))
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'failed')
      process.exitCode = 1
    }
  } else {
    console.error('usage: npm run level -- catalog | usage | check <draft> | pack <draft> [--replace] | unpack <id> | pr <id>')
    process.exitCode = 2
  }
}
