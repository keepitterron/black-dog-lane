// Regenerates public/icons from the dog mark. Needs `rsvg-convert` (brew install librsvg).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dogMarkSvg } from '../src/art/dogMark.ts'

const out = 'public/icons'
const background = '#161210'
const work = mkdtempSync(join(tmpdir(), 'bdl-icons-'))

const svgs = {
  plain: dogMarkSvg({ background, padding: 8 }),
  // Maskable icons get cropped to a circle, so keep the dog inside the central 80%.
  maskable: dogMarkSvg({ background, padding: 30 }),
}

writeFileSync(join(out, 'favicon.svg'), dogMarkSvg({ background, padding: 4 }))
for (const [name, svg] of Object.entries(svgs)) writeFileSync(join(work, `${name}.svg`), svg)

const pngs: [file: string, source: keyof typeof svgs, size: number][] = [
  ['icon-192.png', 'plain', 192],
  ['icon-512.png', 'plain', 512],
  ['maskable-512.png', 'maskable', 512],
  ['apple-touch-icon.png', 'plain', 180],
]
for (const [file, source, size] of pngs) {
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', join(out, file), join(work, `${source}.svg`)])
}
console.log(`wrote ${pngs.length + 1} icons to ${out}`)
