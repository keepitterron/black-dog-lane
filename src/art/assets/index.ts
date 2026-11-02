// The asset catalog: the fixed vocabulary level layers draw from. Generated levels can only
// name assets listed here.
import type { Asset, AssetCtx, Params } from '../kit.ts'
import * as closeUps from './closeUps.ts'
import * as walls from './walls.ts'

export const ASSETS = {
  roomShell: walls.roomShell,
  lighting: walls.lighting,
  portrait: walls.portrait,
  door: walls.door,
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
  underShelfClose: closeUps.underShelfClose,
} satisfies Record<string, Asset>

export type AssetId = keyof typeof ASSETS

export function isAssetId(id: string): id is AssetId {
  return Object.hasOwn(ASSETS, id)
}

export function renderAsset(id: string, params: Params, ctx: AssetCtx): string {
  return isAssetId(id) ? ASSETS[id](params, ctx) : ''
}
