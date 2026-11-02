// A level's own art: shapes draw from the palette and flags, text and colours can't break out
// of the SVG, decor is drawn quieter, own props work as icons, and the validator catches art
// that can't be drawn. Uses the strict fixture's art, never a real level's.
import { expect, test } from 'vitest'
import { renderAsset } from '../src/art/assets/index.ts'
import { iconSvg } from '../src/art/icons.ts'
import type { AssetCtx } from '../src/art/kit.ts'
import { PALETTES, paletteFor } from '../src/art/palettes.ts'
import { placedRect, type ArtSet } from '../src/catalog/assets.ts'
import { parseLevel, type Shape } from '../src/engine/schema.ts'
import { validate } from '../src/solver/validate.ts'
import strictJson from '../levels/test/strict.json'

const art = (shapes: Shape[], extra: Partial<ArtSet[string]> = {}): ArtSet => ({ a01: { kind: 'wall', bbox: [0, 0, 100, 100], anchor: 'wall', shapes, ...extra } })
const ctx = (set: ArtSet, flags: AssetCtx['flags'] = {}): AssetCtx => ({ flags, pal: PALETTES.plain, art: set })

const strict = () => {
  const parsed = parseLevel(structuredClone(strictJson))
  if (!parsed.ok) throw new Error('strict fixture does not parse')
  return parsed.level
}

test('shapes take palette tokens, fixed colours and hex', () => {
  const svg = renderAsset('a01', {}, ctx(art([
    { el: 'rect', x: 0, y: 0, w: 10, h: 10, fill: 'wall' },
    { el: 'circle', cx: 5, cy: 5, r: 2, fill: 'brass' },
    { el: 'line', x1: 0, y1: 0, x2: 9, y2: 9, stroke: '#123456' },
  ])))
  expect(svg).toContain(`fill="${PALETTES.plain.wall}"`)
  expect(svg).toContain('fill="#c9a35a"')
  expect(svg).toContain('stroke="#123456"')
})

test('shapes show and hide on flags', () => {
  const set = art([
    { el: 'rect', x: 0, y: 0, w: 10, h: 10, if: 'lit' },
    { el: 'circle', cx: 5, cy: 5, r: 2, unless: 'lit' },
  ])
  expect(renderAsset('a01', {}, ctx(set))).not.toContain('<rect')
  expect(renderAsset('a01', {}, ctx(set))).toContain('<circle')
  expect(renderAsset('a01', {}, ctx(set, { lit: true }))).toContain('<rect')
  expect(renderAsset('a01', {}, ctx(set, { lit: true }))).not.toContain('<circle')
})

test('text is escaped', () => {
  const svg = renderAsset('a01', {}, ctx(art([{ el: 'text', x: 0, y: 0, text: '<b>"&' }])))
  expect(svg).toContain('&lt;b&gt;&quot;&amp;')
  expect(svg).not.toContain('<b>')
})

test('the schema refuses raw markup in colours and paths', () => {
  const level = strict()
  const bad = (shape: unknown) => parseLevel({ ...level, art: { a09: { kind: 'prop', shapes: [shape] } } }).ok
  expect(bad({ el: 'rect', x: 0, y: 0, w: 1, h: 1, fill: '#fff" onload="x' })).toBe(false)
  expect(bad({ el: 'path', d: 'M0 0"/><script>' })).toBe(false)
  expect(bad({ el: 'image', href: 'x' })).toBe(false)
  expect(bad({ el: 'path', d: 'M0 0 L10 10 Z' })).toBe(true)
})

test('decor is drawn quieter, and own art places like catalog art', () => {
  const set = art([{ el: 'rect', x: 0, y: 0, w: 100, h: 100 }], { decor: true })
  expect(renderAsset('a01', { slot: 'left' }, ctx(set))).toContain('class="art-decor"')
  expect(placedRect('a01', { atX: 200, atY: 300 }, set)).toEqual([150, 250, 100, 100])
})

test('own art can nest catalog and own pieces', () => {
  const set: ArtSet = {
    ...art([{ el: 'use', asset: 'a02', x: 10 }, { el: 'use', asset: 'candleStub', params: { litFlag: 'lit' } }]),
    a02: { kind: 'prop', shapes: [{ el: 'ellipse', cx: 0, cy: 0, rx: 4, ry: 2 }] },
  }
  const svg = renderAsset('a01', {}, ctx(set))
  expect(svg).toContain('<ellipse')
  expect(svg.length).toBeGreaterThan(200)
})

test('an own prop is an inventory icon', () => {
  const set: ArtSet = { a02: { kind: 'prop', shapes: [{ el: 'circle', cx: 0, cy: 0, r: 9, fill: 'brass' }] } }
  expect(iconSvg('a02', ctx(set))).toContain('<circle')
  expect(iconSvg('a02')).toBeNull()
})

test('a palette can lay its own colours over a base', () => {
  expect(paletteFor({ base: 'attic', colours: { wall: '#101010' } })).toEqual({ ...PALETTES.attic, wall: '#101010' })
})

test('the validator catches art that cannot be drawn', () => {
  const level = strict()
  level.art = {
    ...level.art,
    desk: { kind: 'prop', shapes: [{ el: 'circle', cx: 0, cy: 0, r: 1 }] },
    a03: { kind: 'wall', shapes: [{ el: 'use', asset: 'a04' }] },
    a04: { kind: 'prop', shapes: [{ el: 'use', asset: 'a03' }, { el: 'use', asset: 'nothing' }] },
  }
  level.palette = { base: 'nowhere', colours: {} }
  const ids = validate(level).codes.filter(f => f.code === 'ASSET_REF').map(f => f.ids.join(' '))
  expect(ids).toEqual(expect.arrayContaining(['palette', 'desk clash', 'a03 bbox', 'a03 cycle', 'a04 nothing']))
})

test('schema 1 levels are not held to the schema 2 rules', () => {
  const level = strict()
  const south = level.chapters[0].rooms[0]?.walls.s
  if (south) south.layers = south.layers.filter(l => l.asset !== 'a01')
  expect(validate(level).codes.map(f => f.code)).toEqual(['NOVELTY'])
  expect(validate({ ...level, schema: 1 }).codes).toEqual([])
})
