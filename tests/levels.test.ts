// Every level in the repo must parse and have clean references, and real levels must pass the
// strict validator. Real levels are decoded but reported by file and id only, never by content.
import { describe, expect, test } from 'vitest'
import { decodeLevel } from '../src/engine/codec.ts'
import { checkRefs } from '../src/engine/refs.ts'
import { parseLevel } from '../src/engine/schema.ts'
import { validate } from '../src/solver/validate.ts'

const fixtures = import.meta.glob<unknown>('../levels/test/*.json', { eager: true, import: 'default' })
const play = import.meta.glob<string>('../levels/play/*.level', { eager: true, query: '?raw', import: 'default' })

describe('test fixtures', () => {
  test.each(Object.entries(fixtures))('%s is valid', (_file, json) => {
    const result = parseLevel(json)
    expect(result.ok ? [] : result.issues).toEqual([])
    if (result.ok) expect(checkRefs(result.level)).toEqual([])
  })
})

describe.skipIf(Object.keys(play).length === 0)('real levels', () => {
  test.each(Object.entries(play))('%s is valid', async (_file, text) => {
    const result = await decodeLevel(text)
    expect(result.ok ? [] : result.issues).toEqual([])
    if (result.ok) expect(checkRefs(result.level)).toEqual([])
    // Codes and ids only, never content.
    if (result.ok) expect(validate(result.level, { profile: 'play' }).codes).toEqual([])
  })
})
