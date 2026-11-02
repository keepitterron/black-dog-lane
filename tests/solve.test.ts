// Every test level must be finishable with no dead ends. Reports numbers only.
import { expect, test } from 'vitest'
import { parseLevel } from '../src/engine/schema.ts'
import { solve } from '../src/solver/solve.ts'

const fixtures = import.meta.glob<unknown>('../levels/test/*.json', { eager: true, import: 'default' })

test.each(Object.entries(fixtures))('%s is solvable with no dead ends', (_file, json) => {
  const parsed = parseLevel(json)
  if (!parsed.ok) throw new Error('invalid level')
  const report = solve(parsed.level)
  expect(report).toMatchObject({ solvable: true, deadEnds: 0, truncated: false })
})
