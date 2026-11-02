import * as v from 'valibot'
import { describe, expect, test } from 'vitest'
import manifestSource from '../public/manifest.webmanifest?raw'

const Manifest = v.object({
  start_url: v.string(),
  scope: v.string(),
  display: v.string(),
  icons: v.array(v.object({ src: v.string(), sizes: v.string(), purpose: v.optional(v.string()) })),
})
const manifest = v.parse(Manifest, JSON.parse(manifestSource))

describe('web manifest', () => {
  test('is scoped to the Pages base path', () => {
    expect(manifest.start_url).toBe('/black-dog-lane/')
    expect(manifest.scope).toBe('/black-dog-lane/')
    expect(manifest.display).toBe('standalone')
  })

  test('has the icons Android needs to install', () => {
    const sizes = manifest.icons.map(icon => `${icon.sizes}${icon.purpose ? ` ${icon.purpose}` : ''}`)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512 maskable']))
  })
})
