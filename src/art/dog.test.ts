import { expect, test } from 'vitest'
import { DOG_POSES, dogSvg } from './dog.ts'

test('every pose renders an SVG with no NaN coordinates', () => {
  for (const pose of DOG_POSES) {
    for (const motion of [true, false]) {
      const svg = dogSvg({ pose, motion, facing: 'left', carrying: 'ball' })
      expect(svg).toMatch(/^<svg /)
      expect(svg).not.toMatch(/NaN|undefined/)
    }
  }
})

test('motion off removes every animation', () => {
  for (const pose of DOG_POSES) expect(dogSvg({ pose, motion: false })).not.toContain('<animate')
})
