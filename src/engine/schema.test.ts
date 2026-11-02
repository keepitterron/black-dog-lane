import { expect, test } from 'vitest'
import { baseLevel } from '../../tests/fixture.ts'
import { parseLevel } from './schema.ts'

test('the base fixture parses', () => {
  expect(parseLevel(baseLevel())).toEqual({ ok: true, level: baseLevel() })
})

test('a level must have exactly three chapters', () => {
  const level = baseLevel()
  const result = parseLevel({ ...level, chapters: level.chapters.slice(0, 2) })
  expect(result.ok).toBe(false)
})

test('unknown keys are rejected, so invented fields fail loudly', () => {
  const result = parseLevel({ ...baseLevel(), mood: 'x' })
  expect(result).toEqual({ ok: false, issues: [{ path: 'mood', code: 'strict_object' }] })
})

test('messages longer than 140 characters are rejected', () => {
  const level = baseLevel()
  level.combos[0]!.say = 'x'.repeat(141)
  expect(parseLevel(level)).toEqual({ ok: false, issues: [{ path: 'combos.0.say', code: 'max_length' }] })
})

test('effects, conditions and puzzle widgets are closed sets', () => {
  const base = baseLevel()
  const level = { ...base, chapters: base.chapters.map((c, i) => (i === 0 ? { ...c, exitWhen: { op: 'eval', code: 'true' } } : c)) }
  expect(parseLevel(level)).toMatchObject({ ok: false, issues: [{ path: 'chapters.0.exitWhen.op', code: 'variant' }] })
})
