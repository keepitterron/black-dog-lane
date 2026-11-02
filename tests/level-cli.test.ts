// The level authoring tools (scripts/level.ts), exercised on a dull draft made from the
// Two Rooms fixture: its wall hotspots swap their rects for `on:` references to the frames
// drawn under them.
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { catalogText, checkDraft, openPr, pack, resolveDraft, unpack } from '../scripts/level.ts'
import { twoRooms } from '../scripts/levels/two-rooms.ts'
import { ASSET_IDS } from '../src/catalog/assets.ts'
import { decodeLevel, encodeLevel } from '../src/engine/codec.ts'
import type { Level } from '../src/engine/schema.ts'
import { validate } from '../src/solver/validate.ts'

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

// Gives every wall frame drawn under a hotspot an id, then serialises the level with those
// hotspots pointing at their frame (`on`) instead of carrying a rect. `swap` overrides targets.
function draftOf(level: Level, swap: Record<string, string> = {}): unknown {
  const on: Record<string, string> = {}
  for (const room of level.chapters.flatMap(ch => ch.rooms)) {
    for (const view of Object.values(room.walls)) {
      for (const hotspot of view.hotspots) {
        const layer = view.layers.find(l => l.asset === 'frame' && !l.id && JSON.stringify(Object.values(l.params ?? {}).slice(0, 4)) === JSON.stringify(hotspot.rect))
        if (!layer) continue
        layer.id = `${hotspot.id}Art`
        on[hotspot.id] = layer.id
      }
    }
  }
  Object.assign(on, swap)
  const json = JSON.stringify({ ...level, id: 'drafty' }, (_key, value: unknown) => {
    if (!isRecord(value) || !('rect' in value) || typeof value['id'] !== 'string') return value
    const target = on[value['id']]
    if (!target) return value
    const { rect: _rect, ...rest } = value
    return { ...rest, on: target }
  })
  const draft: unknown = JSON.parse(json)
  return draft
}

const tmp = () => mkdtempSync(join(tmpdir(), 'bdl-level-'))

function writeDraft(dir: string, draft: unknown): string {
  const file = join(dir, 'draft.json')
  writeFileSync(file, JSON.stringify(draft))
  return file
}

describe('drafts', () => {
  test('on: resolves to the placed rect of the named layer', () => {
    const draft = draftOf(twoRooms())
    expect(JSON.stringify(draft)).toMatch(/"on":"/)
    expect(resolveDraft(draft)).toEqual([])
    expect(JSON.stringify(draft)).not.toMatch(/"on":"/)
    expect(validate(draft, { profile: 'play' }).ok).toBe(true)
  })

  test('an unknown layer is reported by view and hotspot id', () => {
    const level = twoRooms()
    const room = level.chapters[0].rooms[0]
    const hotspot = room?.walls.n.hotspots[0]
    if (!room || !hotspot) throw new Error('fixture changed')
    expect(resolveDraft(draftOf(level, { [hotspot.id]: 'nope' }))).toEqual([{ code: 'DRAFT_ON', ids: [`${room.id}/n`, hotspot.id] }])
  })

  test('on: also resolves to own art', () => {
    const level = twoRooms()
    const wall = level.chapters[0].rooms[1]?.walls.w
    if (!wall) throw new Error('fixture changed')
    wall.layers.push({ id: 'ownArt', asset: 'a01', params: { atX: 400, atY: 300 } })
    wall.hotspots.push({ id: 'ownTap', rect: [0, 0, 1, 1], rules: [] })
    const draft = draftOf(level, { ownTap: 'ownArt' })
    expect(resolveDraft(draft)).toEqual([])
    expect(JSON.stringify(draft)).toContain('"id":"ownTap","rules":[],"rect":[360,220,80,160]')
  })

  test('a draft on an older schema is refused', () => {
    expect(resolveDraft({ ...twoRooms(), schema: 1 })).toEqual([{ code: 'SCHEMA', ids: ['schema'] }])
  })

  test('check reports OK on a clean draft and CORRUPT on bad JSON', () => {
    const dir = tmp()
    expect(checkDraft(writeDraft(dir, draftOf(twoRooms()))).report.ok).toBe(true)
    writeFileSync(join(dir, 'bad.json'), '{')
    expect(checkDraft(join(dir, 'bad.json')).report.codes).toEqual([{ code: 'CORRUPT', ids: [] }])
  })

  test('pack writes a level that decodes and validates, deletes the draft and never overwrites', async () => {
    const dir = tmp()
    const out = join(dir, 'play')
    const file = writeDraft(dir, draftOf(twoRooms()))
    const first = await pack(file, { outDir: out })
    expect(first.out).toBe(join(out, 'drafty.level'))
    expect(existsSync(file)).toBe(false)
    const decoded = await decodeLevel(readFileSync(join(out, 'drafty.level'), 'utf8'))
    expect(decoded.ok && validate(decoded.level, { profile: 'play' }).ok).toBe(true)

    const again = await pack(writeDraft(dir, draftOf(twoRooms())), { outDir: out })
    expect(again.out).toBeNull()
    expect(again.report.codes).toEqual([{ code: 'EXISTS', ids: ['drafty'] }])
    expect((await pack(writeDraft(dir, draftOf(twoRooms())), { outDir: out, replace: true })).out).toBe(join(out, 'drafty.level'))
  })

  test('unpack turns a real level back into a draft that checks clean', async () => {
    const dir = tmp()
    mkdirSync(join(dir, 'play'))
    writeFileSync(join(dir, 'play/drafty.level'), await encodeLevel({ ...twoRooms(), id: 'drafty' }))
    const file = await unpack('drafty', { playDir: join(dir, 'play'), draftDir: join(dir, 'gen') })
    expect(file).toBe(join(dir, 'gen/drafty.json'))
    expect(checkDraft(file).report.ok).toBe(true)
  })
})

test('the catalog lists every asset', () => {
  const text = catalogText()
  for (const id of ASSET_IDS) expect(text).toMatch(new RegExp(`^${id}\\b`, 'm'))
})

describe('pr', () => {
  const path = process.env['PATH']
  afterEach(() => {
    process.env['PATH'] = path
  })

  test('commits only the level on level/<id>, opens the PR and returns to the branch', async () => {
    const root = tmp()
    const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    const remote = join(root, 'remote.git')
    const repo = join(root, 'repo')
    git(root, 'init', '--bare', '-b', 'main', remote)
    git(root, 'clone', remote, repo)
    git(repo, 'config', 'user.email', 'test@example.com')
    git(repo, 'config', 'user.name', 'Test')
    writeFileSync(join(repo, 'README.md'), 'test\n')
    git(repo, 'add', '.')
    git(repo, 'commit', '-m', 'init')
    git(repo, 'push', '-u', 'origin', 'main')
    git(repo, 'switch', '-c', 'work')

    mkdirSync(join(repo, 'levels/play'), { recursive: true })
    writeFileSync(join(repo, 'levels/play/drafty.level'), await encodeLevel({ ...twoRooms(), id: 'drafty' }))

    const bin = join(root, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'gh'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(root, 'gh-args')}"\necho https://example.com/pull/1\n`)
    chmodSync(join(bin, 'gh'), 0o755)
    process.env['PATH'] = `${bin}:${path ?? ''}`

    expect(await openPr('drafty', { cwd: repo })).toBe('https://example.com/pull/1')
    expect(git(repo, 'branch', '--show-current')).toBe('work')
    expect(git(repo, 'show', '--name-only', '--format=%s', 'level/drafty').split('\n').filter(Boolean)).toEqual(['Add level drafty', 'levels/play/drafty.level'])
    expect(git(remote, 'branch', '--list', 'level/drafty')).toContain('level/drafty')
    const args = readFileSync(join(root, 'gh-args'), 'utf8')
    expect(args).toContain('--head\nlevel/drafty')
    expect(args).toContain('OK')
    expect(existsSync(join(repo, 'levels/play/drafty.level'))).toBe(false)

    // Once merged, a fixed version goes up as an update on its own branch.
    git(repo, 'push', 'origin', 'level/drafty:main')
    mkdirSync(join(repo, 'levels/play'), { recursive: true })
    writeFileSync(join(repo, 'levels/play/drafty.level'), await encodeLevel({ ...twoRooms(), id: 'drafty', theme: 'fixed' }))
    expect(await openPr('drafty', { cwd: repo, now: new Date('2026-11-02T10:20:00Z') })).toBe('https://example.com/pull/1')
    expect(git(repo, 'branch', '--show-current')).toBe('work')
    expect(git(repo, 'log', '-1', '--format=%s', 'level/drafty-202611021020')).toBe('Update level drafty')
    expect(readFileSync(join(root, 'gh-args'), 'utf8')).toContain('Update level: ')

    // A level tracked on the current branch and changed in place (git status ` M`) counts as
    // the only change, and the branch is left with its committed version.
    git(repo, 'fetch', 'origin')
    git(repo, 'merge', '--ff-only', 'origin/main')
    writeFileSync(join(repo, 'levels/play/drafty.level'), await encodeLevel({ ...twoRooms(), id: 'drafty', theme: 'reworked' }))
    expect(git(repo, 'status', '--porcelain')).toBe('M levels/play/drafty.level')
    expect(await openPr('drafty', { cwd: repo, now: new Date('2026-11-02T11:30:00Z') })).toBe('https://example.com/pull/1')
    expect(git(repo, 'branch', '--show-current')).toBe('work')
    expect(git(repo, 'log', '-1', '--format=%s', 'level/drafty-202611021130')).toBe('Update level drafty')
    expect(git(repo, 'status', '--porcelain')).toBe('')
  })

  test('refuses a dirty working tree', async () => {
    const root = tmp()
    execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' })
    mkdirSync(join(root, 'levels/play'), { recursive: true })
    writeFileSync(join(root, 'levels/play/drafty.level'), await encodeLevel({ ...twoRooms(), id: 'drafty' }))
    writeFileSync(join(root, 'stray.txt'), 'x')
    await expect(openPr('drafty', { cwd: root })).rejects.toThrow('not clean')
  })
})
