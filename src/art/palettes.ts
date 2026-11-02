// Colour token sets, one per level theme. Assets take room colours (walls, floor, wood, cloth,
// light) from the palette in their context; colours that mean something (brass keys, flame,
// paper, ink) stay fixed so clues read the same in every room.
import { isPaletteId, type PaletteId, type PaletteToken } from '../catalog/assets.ts'
import type { LevelPalette } from '../engine/schema.ts'

export type Palette = Record<PaletteToken, string>

// The prototype's colours. Every other palette is a variation on it.
const waiting: Palette = {
  wall: '#56604c',
  wallDark: '#4b5442',
  wallMotif: '#67715a',
  rail: '#3d3026',
  skirting: '#3a2a20',
  floor: '#4a3326',
  floorSeam: '#38261c',
  wood: '#3b281c',
  woodDark: '#2a1c13',
  woodEdge: '#24180f',
  woodMid: '#4a3326',
  woodLight: '#5a3e2c',
  cloth: '#4b2e2e',
  light: '#e3a84b',
  dark: '#0c0907',
}

export const PALETTES: Record<PaletteId, Palette> = {
  waiting,
  plain: { ...waiting, wall: '#5a5a52', wallDark: '#4f4f48', wallMotif: '#68685e' },
  // Cold bare boards under a roof.
  attic: {
    ...waiting,
    wall: '#5d5a52',
    wallDark: '#4e4b44',
    wallMotif: '#6c685e',
    floor: '#54473a',
    floorSeam: '#3e342a',
    wood: '#4a3f33',
    woodDark: '#342c23',
    woodEdge: '#2a231c',
    woodMid: '#54473a',
    woodLight: '#665747',
    cloth: '#3f4650',
    light: '#d9c48f',
  },
  // Damp stone-blue walls, black wood.
  cellar: {
    ...waiting,
    wall: '#3f4a4f',
    wallDark: '#353f44',
    wallMotif: '#4c585d',
    rail: '#2b2a27',
    skirting: '#262420',
    floor: '#2f2e2a',
    floorSeam: '#22211e',
    wood: '#2a241e',
    woodDark: '#1c1814',
    woodEdge: '#15120f',
    woodMid: '#2f2a24',
    woodLight: '#3d352d',
    cloth: '#3a3f2e',
    light: '#c9b27a',
  },
  // Faded pink paper, pale wood.
  nursery: {
    ...waiting,
    wall: '#7a5f5f',
    wallDark: '#6b5252',
    wallMotif: '#8c7070',
    rail: '#4a3a33',
    skirting: '#44352d',
    floor: '#5c4636',
    floorSeam: '#47362a',
    wood: '#5a4535',
    woodDark: '#3f3025',
    woodEdge: '#32261d',
    woodMid: '#5c4636',
    woodLight: '#715846',
    cloth: '#4d5c6b',
    light: '#ead09a',
  },
  // Deep green study, red-brown wood.
  study: {
    ...waiting,
    wall: '#2f4a3c',
    wallDark: '#283f33',
    wallMotif: '#3a5848',
    rail: '#3a2620',
    skirting: '#34221c',
    floor: '#45291f',
    floorSeam: '#331e17',
    wood: '#4a2a1e',
    woodDark: '#331c14',
    woodEdge: '#28150f',
    woodMid: '#45291f',
    woodLight: '#5e3a2a',
    cloth: '#6b2a2a',
  },
  // Grey, burnt and almost colourless.
  ash: {
    ...waiting,
    wall: '#4a4744',
    wallDark: '#403d3b',
    wallMotif: '#575350',
    rail: '#2e2c2a',
    skirting: '#2a2826',
    floor: '#3a3634',
    floorSeam: '#2b2826',
    wood: '#33302d',
    woodDark: '#252321',
    woodEdge: '#1d1b1a',
    woodMid: '#3a3634',
    woodLight: '#4a4643',
    cloth: '#3d3535',
    light: '#d0b98a',
  },
}

const named = (id: string): Palette => (isPaletteId(id) ? PALETTES[id] : waiting)

// A level's palette: a catalog one, or a catalog base with the level's own colours over it.
export function paletteFor(palette: LevelPalette): Palette {
  return typeof palette === 'string' ? named(palette) : { ...named(palette.base), ...palette.colours }
}
