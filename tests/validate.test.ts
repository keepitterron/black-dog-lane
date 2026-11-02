// The validator over every test fixture: hand-built fixtures pass their profile and the strict
// fixture passes the play profile (broken fixtures are in broken.test.ts). Codes and ids only.
import { expect, test } from 'vitest'
import { validate, type Profile } from '../src/solver/validate.ts'
import { baseLevel } from './fixture.ts'

const fixtures = import.meta.glob<unknown>('../levels/test/*.json', { eager: true, import: 'default' })

const PROFILES: Record<string, Profile> = {
  '../levels/test/waiting-room.json': 'fixture',
  '../levels/test/basic.json': 'fixture',
  '../levels/test/strict.json': 'play',
}

// Solvable, no dead ends, and the search finished, plus whatever else the profile checks.
// Timed too: the generator's repair loop runs the validator several times per level.
test.each(Object.entries(fixtures))('%s passes its profile', (file, json) => {
  expect(PROFILES[file], 'add the fixture to PROFILES').toBeDefined()
  const started = performance.now()
  expect(validate(json, { profile: PROFILES[file] ?? 'play' }).codes).toEqual([])
  expect(performance.now() - started).toBeLessThan(5000)
})

test('a file that does not parse reports schema paths only', () => {
  const report = validate({ ...baseLevel(), title: 42 })
  expect(report).toMatchObject({ ok: false, stats: null })
  expect(report.codes).toContainEqual({ code: 'SCHEMA', ids: ['title'] })
})

test('broken references are reported by id', () => {
  const level = baseLevel()
  level.combos.push({ a: 'a', b: 'missing', make: 'ab', say: 'Combined.' })
  expect(validate(level).codes).toContainEqual({ code: 'UNKNOWN_ITEM', ids: ['missing'] })
})

test('a search that hits its state cap says so', () => {
  const report = validate(fixtures['../levels/test/waiting-room.json'], { profile: 'fixture', maxStates: 50 })
  expect(report.codes.map(f => f.code)).toContain('TRUNCATED')
})
