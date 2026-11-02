// Spoiler-free validator report for level files (.json fixtures or encoded .level files).
// Prints one line per file, plus codes, chapter ids and opaque ids on failure; never level
// text. Exits 1 if any file fails.
//
//   npm run validate -- [--fixture] <file…>
import { readFileSync } from 'node:fs'
import { decodeLevel } from '../src/engine/codec.ts'
import { validate, type ValidateReport } from '../src/solver/validate.ts'

const args = process.argv.slice(2)
const profile = args.includes('--fixture') ? 'fixture' : 'play'
const files = args.filter(a => !a.startsWith('--'))
if (files.length === 0) {
  console.error('usage: npm run validate -- [--fixture] <file…>')
  process.exit(2)
}

const n = (x: number) => x.toLocaleString('en-US')

function summary({ stats }: ValidateReport): string {
  if (!stats) return ''
  const [lo, hi] = stats.threads
  return [
    `${stats.chapters} chapters`,
    `${n(stats.steps)} steps (${stats.chapterSteps.join('/')})`,
    `threads ${lo}–${hi}`,
    `secrets ${stats.secrets}`,
    `beats ${stats.beats}`,
    `states ${n(stats.states)}`,
  ].join(' · ')
}

async function load(file: string): Promise<unknown> {
  const text = readFileSync(file, 'utf8')
  if (!file.endsWith('.level')) return JSON.parse(text)
  const decoded = await decodeLevel(text)
  // Hand the validator the parsed level, or a stand-in it will reject with the same codes.
  return decoded.ok ? decoded.level : { decodeIssues: decoded.issues }
}

let failed = 0
for (const file of files) {
  let report: ValidateReport
  try {
    report = validate(await load(file), { profile })
  } catch {
    report = { ok: false, codes: [{ code: 'SCHEMA', ids: ['unreadable'] }], stats: null }
  }
  console.log(`${file}  ${report.ok ? 'OK' : 'FAIL'}  ${summary(report)}`.trimEnd())
  for (const f of report.codes) console.log(`  ${f.code}${f.chapter ? `  ${f.chapter}` : ''}${f.ids.length ? `  ${f.ids.join(' ')}` : ''}`)
  if (!report.ok) failed++
}
if (failed) process.exit(1)
