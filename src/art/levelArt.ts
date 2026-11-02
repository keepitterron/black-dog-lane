// Draws a level's own art (`level.art`): a closed set of shapes, coloured from the palette, that
// can show or hide on flags and nest other assets. Text is escaped and colours are checked by the
// schema, so level data never reaches the SVG unfiltered.
import type { Shape } from '../engine/schema.ts'
import { BRASS, FONT, INK, PAPER, type AssetCtx, type Params } from './kit.ts'

// Draws another asset by id (catalog or own); supplied by the asset registry.
export type DrawAsset = (id: string, params: Params, ctx: AssetCtx, depth: number) => string

const FIXED: Record<string, string> = {
  ink: INK,
  paper: PAPER,
  brass: BRASS,
  flame: 'url(#flame)',
  glass: 'url(#glass)',
  beyond: 'url(#beyond)',
  shadow: '#0c0907',
  none: 'none',
}

const r = (n: number) => +n.toFixed(2)
const esc = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function paint(name: string | undefined, ctx: AssetCtx): string | undefined {
  if (name === undefined) return undefined
  if (name.startsWith('#')) return name
  return Object.hasOwn(FIXED, name) ? FIXED[name] : (ctx.pal as Record<string, string>)[name]
}

function attrs(shape: Shape, ctx: AssetCtx, lines: boolean): string {
  const fill = paint(shape.fill, ctx) ?? (lines ? 'none' : INK)
  const stroke = paint(shape.stroke, ctx) ?? (lines ? INK : undefined)
  let a = ` fill="${fill}"`
  if (stroke) a += ` stroke="${stroke}" stroke-width="${r(shape.width ?? 3)}" stroke-linecap="round" stroke-linejoin="round"`
  if (shape.opacity !== undefined) a += ` opacity="${r(shape.opacity)}"`
  if (shape.anim) a += ` class="art-${shape.anim}"`
  return a
}

const shown = (shape: Shape, ctx: AssetCtx) => (!shape.if || Boolean(ctx.flags[shape.if])) && (!shape.unless || !ctx.flags[shape.unless])

export function drawShapes(shapes: Shape[], ctx: AssetCtx, draw: DrawAsset, depth: number): string {
  return shapes.map(shape => (shown(shape, ctx) ? drawShape(shape, ctx, draw, depth) : '')).join('')
}

function drawShape(shape: Shape, ctx: AssetCtx, draw: DrawAsset, depth: number): string {
  switch (shape.el) {
    case 'rect':
      return `<rect x="${r(shape.x)}" y="${r(shape.y)}" width="${r(shape.w)}" height="${r(shape.h)}"${shape.r ? ` rx="${r(shape.r)}"` : ''}${attrs(shape, ctx, false)}/>`
    case 'circle':
      return `<circle cx="${r(shape.cx)}" cy="${r(shape.cy)}" r="${r(shape.r)}"${attrs(shape, ctx, false)}/>`
    case 'ellipse':
      return `<ellipse cx="${r(shape.cx)}" cy="${r(shape.cy)}" rx="${r(shape.rx)}" ry="${r(shape.ry)}"${attrs(shape, ctx, false)}/>`
    case 'line':
      return `<line x1="${r(shape.x1)}" y1="${r(shape.y1)}" x2="${r(shape.x2)}" y2="${r(shape.y2)}"${attrs(shape, ctx, true)}/>`
    case 'poly': {
      const pts = shape.points.map(r).join(' ')
      return shape.open ? `<polyline points="${pts}"${attrs(shape, ctx, true)}/>` : `<polygon points="${pts}"${attrs(shape, ctx, false)}/>`
    }
    case 'path':
      return `<path d="${shape.d}"${attrs(shape, ctx, !shape.fill)}/>`
    case 'text':
      return `<text x="${r(shape.x)}" y="${r(shape.y)}" text-anchor="middle" font-family="${FONT}"${shape.italic ? ' font-style="italic"' : ''} font-size="${r(shape.size ?? 22)}"${attrs({ ...shape, fill: shape.fill ?? 'paper' }, ctx, false)}>${esc(shape.text)}</text>`
    case 'group': {
      const t = `translate(${r(shape.x ?? 0)} ${r(shape.y ?? 0)}) rotate(${r(shape.rotate ?? 0)}) scale(${r(shape.scale ?? 1)})`
      return `<g transform="${t}"${shape.opacity === undefined ? '' : ` opacity="${r(shape.opacity)}"`}${shape.anim ? ` class="art-${shape.anim}"` : ''}>${drawShapes(shape.shapes, ctx, draw, depth)}</g>`
    }
    case 'use': {
      // Nesting is checked by the validator (no cycles); the depth cap only guards bad data.
      if (depth > 4) return ''
      const inner = draw(shape.asset, shape.params ?? {}, ctx, depth + 1)
      const t = `translate(${r(shape.x ?? 0)} ${r(shape.y ?? 0)}) scale(${r(shape.scale ?? 1)})`
      return `<g transform="${t}"${shape.opacity === undefined ? '' : ` opacity="${r(shape.opacity)}"`}${shape.anim ? ` class="art-${shape.anim}"` : ''}>${inner}</g>`
    }
  }
}
