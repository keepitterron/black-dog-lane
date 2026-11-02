// Placeholder dog silhouette for the title screen and app icons, in a 100×100 box.
// The full posable dog asset replaces this in Milestone 3.

export type DogMarkOptions = { coat?: string; white?: string; rim?: string }

export function dogMark({ coat = '#0d0b0a', white = '#e9e2d4', rim = '#e3a84b' }: DogMarkOptions = {}): string {
  const body = `
    <path d="M30 92 Q20 92 21 78 Q22 60 38 56 L52 50 Q55 40 60 33 L72 33 Q76 44 72 56 L70 92 Z"/>
    <circle cx="66" cy="28" r="13"/>
    <path d="M70 22 Q86 22 89 30 Q90 38 82 39 L70 40 Z"/>
    <path d="M24 86 Q10 86 9 74" fill="none" stroke-width="5" stroke-linecap="round"/>`
  return `
    <g fill="none" stroke="${rim}" stroke-width="3.5" stroke-linejoin="round" opacity=".55">${body}</g>
    <g fill="${coat}" stroke="${coat}" stroke-width="1" stroke-linejoin="round">${body}</g>
    <path d="M58 20 Q50 22 51 34 Q52 41 57 40 Q61 32 60 21 Z" fill="#1c1715"/>
    <path d="M71 22.6 Q85 22.6 88.3 29" fill="none" stroke="${white}" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="88" cy="31" rx="2.6" ry="2.2" fill="#000"/>
    <circle cx="69" cy="25" r="1.8" fill="#9a7a3c"/>
    <path d="M62 48 Q67 46 70 50 L68 66 Q63 62 62 48 Z" fill="${white}"/>
    <path d="M55 92 h7 v-3 h-7 Z M64 92 h6 v-3 h-6 Z" fill="${white}"/>`
}

export function dogMarkSvg(options: DogMarkOptions & { background?: string; padding?: number } = {}): string {
  const { background, padding = 0, ...colors } = options
  const size = 100 + padding * 2
  const bg = background ? `<rect x="${-padding}" y="${-padding}" width="${size}" height="${size}" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padding} ${-padding} ${size} ${size}">${bg}${dogMark(colors)}</svg>`
}
