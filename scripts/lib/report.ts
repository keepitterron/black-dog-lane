// Spoiler-free report lines shared by `npm run validate` and `npm run level`: counts, codes,
// chapter ids and opaque ids, never level text.
import type { Stats } from '../../src/solver/validate.ts'

// A validator report, or one from the level tools with their own codes.
export type Report = { ok: boolean; codes: { code: string; chapter?: string; ids: string[] }[]; stats: Stats | null }

const n = (x: number) => x.toLocaleString('en-US')

export function summary({ stats }: Report): string {
  if (!stats) return ''
  const [lo, hi] = stats.threads
  return [
    `${stats.chapters} chapters`,
    `${n(stats.steps)} steps (${stats.chapterSteps.join('/')})`,
    `threads ${lo}–${hi}`,
    `secrets ${stats.secrets}`,
    `beats ${stats.beats}`,
    `own art ${stats.art}`,
    `states ${n(stats.states)}`,
  ].join(' · ')
}

export function reportLines(name: string, report: Report): string[] {
  return [
    `${name}  ${report.ok ? 'OK' : 'FAIL'}  ${summary(report)}`.trimEnd(),
    ...report.codes.map(f => `  ${f.code}${f.chapter ? `  ${f.chapter}` : ''}${f.ids.length ? `  ${f.ids.join(' ')}` : ''}`),
  ]
}
