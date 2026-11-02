// Tools for authoring real levels with the /new-level skill. Drafts are plain Level JSON in the
// git-ignored .gen/ folder; this script checks them, packs them into encoded levels/play files
// and opens the level PR. Output is spoiler-free: counts, codes and ids, never level text.
//
//   npm run level -- catalog          what a level may use: assets, params, slots, widgets
//   npm run level -- check <draft>    resolve the draft and run the strict validator
//   npm run level -- pack <draft>     check, encode to levels/play/<id>.level, delete the draft
//                                     (--replace overwrites an existing level, for fixes)
//   npm run level -- unpack <id>      decode a real level into .gen/<id>.json, for fixes
//   npm run level -- pr <id>          commit only that file on its own branch and open the PR
//
// Draft sugar: a hotspot may give `on: "<layerId>"` instead of `rect`; the rect becomes the
// placed bbox of that layer in the same view, so drafts never need coordinates for wall pieces.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ASSET_IDS,
  CATALOG,
  ICON_IDS,
  isAssetId,
  PALETTE_IDS,
  PLACEMENT,
  SLOT_BOX,
  SYMBOLS,
  placedRect,
  type Params,
  type ParamSpec,
} from '../src/catalog/assets.ts'
import { decodeLevel, encodeLevel } from '../src/engine/codec.ts'
import { MIN_TAP_UNITS, SCENE_H, SCENE_W } from '../src/engine/layout.ts'
import { MESSAGE_MAX, parseLevel, SFX, WALLS } from '../src/engine/schema.ts'
import { validate } from '../src/solver/validate.ts'
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
    '## draft sugar  a hotspot may give on: "<layerId>" instead of rect (wall pieces and props only)',
  )
  return out.join('\n')
}

// ── drafts ───────────────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x)
const records = (x: unknown): Json[] => (Array.isArray(x) ? x.filter(isRecord) : [])
const isParams = (x: unknown): x is Params => isRecord(x) && Object.values(x).every(v => typeof v === 'number' || typeof v === 'string')

function resolveView(viewId: string, view: unknown, problems: Finding[]) {
  if (!isRecord(view)) return
  const layers = records(view['layers'])
  for (const hotspot of records(view['hotspots'])) {
    const on = hotspot['on']
    if (on === undefined) continue
    delete hotspot['on']
    const layer = layers.find(l => l['id'] === on)
    const asset = layer?.['asset']
    const params = layer?.['params'] ?? {}
    const rect = typeof asset === 'string' && isAssetId(asset) && isParams(params) ? placedRect(asset, params) : null
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
  for (const chapter of records(draft['chapters'])) {
    for (const room of records(chapter['rooms'])) {
      const walls = room['walls']
      if (isRecord(walls)) for (const wall of WALLS) resolveView(`${String(room['id'])}/${wall}`, walls[wall], problems)
      const closeUps = room['closeUps']
      if (isRecord(closeUps)) for (const [id, view] of Object.entries(closeUps)) resolveView(id, view, problems)
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

  const dirty = run(cwd, 'git', ['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter(line => line && line.slice(3) !== file)
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
    console.error('usage: npm run level -- catalog | check <draft> | pack <draft> [--replace] | unpack <id> | pr <id>')
    process.exitCode = 2
  }
}
