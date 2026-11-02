// The drawing behind every catalog entry (src/catalog/assets.ts says what each one is and
// takes). Generated levels can only name assets listed there.
import { isAssetId, meta, placement, type AssetId } from '../../catalog/assets.ts'
import type { Asset, AssetCtx, Params } from '../kit.ts'
import * as closeUps from './closeUps.ts'
import * as furniture from './furniture.ts'
import * as props from './props.ts'
import * as templates from './templates.ts'
import * as walls from './walls.ts'

export const ASSETS: Record<AssetId, Asset> = {
  roomShell: walls.roomShell,
  lighting: walls.lighting,
  portrait: walls.portrait,
  door: walls.door,
  doorway: walls.doorway,
  frame: walls.frame,
  caseClock: walls.caseClock,
  coatOnHook: walls.coatOnHook,
  desk: walls.desk,
  note: walls.note,
  candle: walls.candle,
  rug: walls.rug,
  bookshelf: walls.bookshelf,
  birdcage: walls.birdcage,
  curtainedWindow: walls.curtainedWindow,
  plantPot: walls.plantPot,
  chair: furniture.chair,
  mirror: furniture.mirror,
  cabinet: furniture.cabinet,
  bed: furniture.bed,
  wardrobe: furniture.wardrobe,
  piano: furniture.piano,
  shelf: furniture.shelf,
  table: furniture.table,
  wallClock: furniture.wallClock,
  plainWindow: furniture.plainWindow,
  trailMark: furniture.trailMark,
  candleStub: props.candleStub,
  photograph: props.photograph,
  paperNote: props.paperNote,
  matchbox: props.matchbox,
  keyRing: props.keyRing,
  musicBox: props.musicBox,
  jar: props.jar,
  doll: props.doll,
  mask: props.mask,
  toy: props.toy,
  ball: props.ball,
  bell: props.bell,
  clockFaceClose: closeUps.clockFaceClose,
  portraitClose: closeUps.portraitClose,
  drawerClosedClose: closeUps.drawerClosedClose,
  drawerOpenClose: closeUps.drawerOpenClose,
  photoClose: closeUps.photoClose,
  bookClosedClose: closeUps.bookClosedClose,
  bookOpenClose: closeUps.bookOpenClose,
  potClose: closeUps.potClose,
  coatClose: closeUps.coatClose,
  cageClose: closeUps.cageClose,
  windowClose: closeUps.windowClose,
  lockPlateClose: closeUps.lockPlateClose,
  bookSpreadClose: templates.bookSpreadClose,
  containerClose: templates.containerClose,
  fogGlassClose: templates.fogGlassClose,
  noteClose: templates.noteClose,
  mirrorClose: templates.mirrorClose,
  panelClose: templates.panelClose,
  musicBoxClose: templates.musicBoxClose,
}

// Draws a layer, moved into its slot or anchor point when it has one. Unknown ids draw
// nothing (the validator rejects them).
const r = (n: number) => +n.toFixed(2)

export function renderAsset(id: string, params: Params, ctx: AssetCtx): string {
  if (!isAssetId(id)) return ''
  const art = ASSETS[id](params, ctx)
  const at = placement(meta(id), params)
  if (!at || !art) return art
  return `<g transform="translate(${r(at.dx)} ${r(at.dy)}) scale(${r(at.s)})">${art}</g>`
}
