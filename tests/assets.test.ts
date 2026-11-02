// The art catalog: every asset draws well-formed SVG in every palette and flag state, fits
// the scene in every slot it allows, and the Waiting Room still looks exactly as it did.
import { describe, expect, test } from 'vitest'
import { ASSETS, renderAsset } from '../src/art/assets/index.ts'
import { iconSvg } from '../src/art/icons.ts'
import { sceneDefs } from '../src/art/kit.ts'
import { PALETTES } from '../src/art/palettes.ts'
import { ASSET_IDS, CATALOG, ICON_IDS, paramProblems, placedRect, type AssetId, type Params } from '../src/catalog/assets.ts'
import { parseLevel } from '../src/engine/schema.ts'
import waitingRoom from '../levels/test/waiting-room.json'

// Opening and closing tags balance, and nothing undefined leaked into the markup.
function wellFormed(svg: string): string[] {
  const problems: string[] = []
  if (/undefined|NaN|\[object/.test(svg)) problems.push('leak')
  const stack: string[] = []
  for (const [tag] of svg.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
    if (tag.endsWith('/>')) continue
    const name = /^<\/?([a-zA-Z]+)/.exec(tag)?.[1] ?? ''
    if (!tag.startsWith('</')) stack.push(name)
    else if (stack.pop() !== name) problems.push(`close:${name}`)
  }
  if (stack.length) problems.push(`open:${stack.join(',')}`)
  return problems
}

// Default params, plus every flag param named after itself and the puzzle param set.
function paramsFor(id: AssetId): Params {
  const params: Params = {}
  for (const [key, spec] of Object.entries(CATALOG[id].params)) {
    if (spec.type === 'flag') params[key] = key
    if (spec.type === 'puzzle') params[key] = 'p1'
  }
  return params
}

describe.each(ASSET_IDS)('%s', id => {
  const params = paramsFor(id)
  const allOn = Object.fromEntries(Object.values(params).map(flag => [flag, true]))

  test('draws well-formed SVG in every palette, flags off and on', () => {
    for (const pal of Object.values(PALETTES))
      for (const flags of [{}, allOn]) {
        const svg = renderAsset(id, params, { flags, pal })
        expect(wellFormed(svg)).toEqual([])
      }
  })

  test('declares its flags as *Flag params and accepts its own defaults', () => {
    for (const [key, spec] of Object.entries(CATALOG[id].params)) expect(spec.type === 'flag', key).toBe(key.endsWith('Flag'))
    expect(paramProblems(id, params)).toEqual([])
  })

  const meta = CATALOG[id]
  const slots = 'slots' in meta ? meta.slots : []
  test.skipIf(slots.length === 0)('stays inside the scene in every slot', () => {
    for (const slot of slots) {
      const rect = placedRect(id, { slot })
      expect(rect).not.toBeNull()
      const [x, y, w, h] = rect ?? [0, 0, 0, 0]
      expect([x >= -1, y >= -1, x + w <= 801, y + h <= 601], slot).toEqual([true, true, true, true])
    }
  })
})

test('every asset has a drawing and every icon draws', () => {
  expect(Object.keys(ASSETS).toSorted()).toEqual([...ASSET_IDS].toSorted())
  for (const icon of ICON_IDS) expect(iconSvg(icon), icon).not.toBeNull()
})

test('a slot the asset does not allow is a problem', () => {
  expect(paramProblems('desk', { slot: 'left' })).toEqual(['slot'])
  expect(paramProblems('roomShell', { pattern: 'tartan', wobble: 1 })).toEqual(['value:pattern', 'param:wobble'])
})

test('placement moves and scales the drawing; no placement leaves it as drawn', () => {
  expect(placedRect('desk', {})).toEqual([220, 350, 360, 124])
  expect(placedRect('chair', { slot: 'left' })).toEqual([90, 250, 120, 222])
  expect(placedRect('matchbox', { atX: 300, atY: 350 })).toEqual([270, 290, 60, 60])
})

// Every layer of the Waiting Room, flags off and on, hashed. Its art must not drift.
test('the Waiting Room renders as it always has', () => {
  const result = parseLevel(waitingRoom)
  if (!result.ok) throw new Error('waiting room does not parse')
  const pal = PALETTES.waiting
  let all = sceneDefs(pal)
  for (const ch of result.level.chapters)
    for (const room of ch.rooms)
      for (const view of [...Object.values(room.walls), ...Object.values(room.closeUps)])
        for (const layer of view.layers) {
          const params = layer.params ?? {}
          const on = Object.fromEntries(Object.entries(params).filter(([k, v]) => k.endsWith('Flag') && typeof v === 'string').map(([, v]) => [v, true]))
          all += renderAsset(layer.asset, params, { flags: {}, pal }) + renderAsset(layer.asset, params, { flags: on, pal })
        }
  let hash = 0x811c9dc5
  for (let i = 0; i < all.length; i++) hash = Math.imul(hash ^ all.charCodeAt(i), 0x01000193)
  expect({ length: all.length, hash: (hash >>> 0).toString(36) }).toMatchInlineSnapshot(`
    {
      "hash": "zvbva2",
      "length": 192702,
    }
  `)
})
