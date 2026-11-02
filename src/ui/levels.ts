// The levels the title screen lists: real levels (decoded from levels/play/*.level) first,
// then the playable test levels. Dull engine fixtures are added in dev builds only. Problems
// are logged by file name only, never by content.
import { decodeLevel } from '../engine/codec.ts'
import { parseLevel, type Level } from '../engine/schema.ts'

export type Entry = { level: Level; test: boolean }

const play = import.meta.glob<string>('../../levels/play/*.level', { eager: true, query: '?raw', import: 'default' })
// In this order, after the real levels.
const SHOWN = ['../../levels/test/waiting-room.json', '../../levels/test/two-rooms.json']
const shown = import.meta.glob<unknown>(['../../levels/test/waiting-room.json', '../../levels/test/two-rooms.json'], {
  eager: true,
  import: 'default',
})
// Lazy, so production builds drop them along with the branch that loads them.
const devOnly = import.meta.env.DEV
  ? import.meta.glob<unknown>(['../../levels/test/*.json', '!../../levels/test/waiting-room.json', '!../../levels/test/two-rooms.json'], {
      import: 'default',
    })
  : {}

let catalog: Promise<Entry[]> | null = null

export function loadCatalog(): Promise<Entry[]> {
  catalog ??= build()
  return catalog
}

async function build(): Promise<Entry[]> {
  const entries: Entry[] = []
  const add = (file: string, level: Level, test: boolean) => {
    if (entries.some(e => e.level.id === level.id)) console.warn('levels: duplicate id in', file)
    else entries.push({ level, test })
  }
  for (const [file, text] of Object.entries(play).toSorted(([a], [b]) => (a < b ? -1 : 1))) {
    const result = await decodeLevel(text)
    if (result.ok) add(file, result.level, false)
    else console.warn('levels: skipped', file, result.issues.map(i => i.code).join(','))
  }
  const tests: [string, unknown][] = [
    ...SHOWN.map(file => [file, shown[file]] as [string, unknown]),
    ...(await Promise.all(Object.entries(devOnly).map(async ([file, load]) => [file, await load()] as [string, unknown]))),
  ]
  for (const [file, json] of tests) {
    const result = parseLevel(json)
    if (result.ok) add(file, result.level, true)
    else console.warn('levels: skipped', file)
  }
  return entries
}
