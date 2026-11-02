// Every level in the repo must parse and have clean references, and real levels must pass the
// strict validator. Real levels are decoded but reported by file and id only, never by content.
import { describe, expect, test } from 'vitest'
import { isAssetId } from '../src/art/assets/index.ts'
import { ICONS } from '../src/art/icons.ts'
import { decodeLevel } from '../src/engine/codec.ts'
import { checkRefs } from '../src/engine/refs.ts'
import { parseLevel, type Level } from '../src/engine/schema.ts'
import { validate } from '../src/solver/validate.ts'

const fixtures = import.meta.glob<unknown>('../levels/test/*.json', { eager: true, import: 'default' })
const play = import.meta.glob<string>('../levels/play/*.level', { eager: true, query: '?raw', import: 'default' })

// Every asset and icon a level names must exist in the art catalog.
function missingArt(level: Level): string[] {
  const missing = Object.values(level.items).filter(item => !ICONS[item.icon]).map(item => item.icon)
  for (const chapter of level.chapters)
    for (const room of chapter.rooms)
      for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)])
        for (const layer of view.layers) if (!isAssetId(layer.asset)) missing.push(layer.asset)
  return missing
}

describe('test fixtures', () => {
  test.each(Object.entries(fixtures))('%s is valid', (_file, json) => {
    const result = parseLevel(json)
    expect(result.ok ? [] : result.issues).toEqual([])
    if (result.ok) expect(checkRefs(result.level)).toEqual([])
  })

  // basic.json is an engine fixture with placeholder art names; it is never drawn outside dev.
  const drawn = Object.entries(fixtures).filter(([file]) => !file.endsWith('/basic.json'))
  test.each(drawn)('%s only uses art that exists', (_file, json) => {
    const result = parseLevel(json)
    expect(result.ok && missingArt(result.level)).toEqual([])
  })
})

describe.skipIf(Object.keys(play).length === 0)('real levels', () => {
  test.each(Object.entries(play))('%s is valid', async (_file, text) => {
    const result = await decodeLevel(text)
    expect(result.ok ? [] : result.issues).toEqual([])
    if (result.ok) expect(checkRefs(result.level)).toEqual([])
    if (result.ok) expect(missingArt(result.level)).toEqual([])
    // Codes and ids only, never content.
    if (result.ok) expect(validate(result.level, { profile: 'play' }).codes).toEqual([])
  })
})
