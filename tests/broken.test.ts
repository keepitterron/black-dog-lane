// Each broken fixture (scripts/levels/broken.ts) reports exactly its own code. Its own file so
// Vitest runs it alongside the other validator tests.
import { expect, test } from 'vitest'
import { CHECK_CODES, validate } from '../src/solver/validate.ts'

const broken = import.meta.glob<unknown>('../levels/test/broken/*.json', { eager: true, import: 'default' })

const codeOf = (file: string) => file.split('/').at(-1)?.replace('.json', '') ?? ''

test.each(Object.entries(broken).map(([file, json]) => [codeOf(file), json]))('broken fixture %s reports only its code', (code, json) => {
  expect(validate(json).codes.map(f => f.code)).toEqual([code])
})

test('every check has a broken fixture', () => {
  expect(Object.keys(broken).map(codeOf).toSorted()).toEqual([...CHECK_CODES].toSorted())
})
