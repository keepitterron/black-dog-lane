import { expect, test } from 'vitest'
import { MIN_TAP_UNITS, padRect } from './hitRect.ts'

test('small hotspots grow around their centre to the minimum tap size; big ones are untouched', () => {
  expect(MIN_TAP_UNITS * (360 / 800)).toBeGreaterThanOrEqual(44)
  const [x, y, w, h] = padRect([100, 100, 20, 200])
  expect([w, h]).toEqual([MIN_TAP_UNITS, 200])
  expect(x + w / 2).toBe(110)
  expect(y).toBe(100)
  expect(padRect([0, 0, 300, 300])).toEqual([0, 0, 300, 300])
})
