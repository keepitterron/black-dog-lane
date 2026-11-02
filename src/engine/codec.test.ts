import { expect, test } from 'vitest'
import { baseLevel } from '../../tests/fixture.ts'
import { decodeLevel, encodeLevel } from './codec.ts'

test('encode → decode round-trips a level', async () => {
  const level = baseLevel()
  const text = await encodeLevel(level)
  expect(text).toMatch(/^[A-Za-z0-9+/]+=*$/)
  expect(text).not.toContain('Fixture')
  expect(await decodeLevel(text)).toEqual({ ok: true, level })
})

test('garbage decodes to a CORRUPT issue', async () => {
  expect(await decodeLevel('not a level')).toEqual({ ok: false, issues: [{ path: '', code: 'CORRUPT' }] })
})

test('schema failures report paths and check names, never values', async () => {
  const level = { ...baseLevel(), title: '', secretWord: 'SPOILER' }
  const result = await decodeLevel(await encodeLevel(level))
  expect(result.ok).toBe(false)
  expect(JSON.stringify(result)).not.toContain('SPOILER')
  if (!result.ok) expect(result.issues).toContainEqual({ path: 'title', code: 'min_length' })
})
