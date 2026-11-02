import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { FIXTURES } from '../scripts/fixtures.ts'

test.each(Object.entries(FIXTURES))('%s matches its builder (run `npm run fixtures`)', (file, build) => {
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(build())
})
