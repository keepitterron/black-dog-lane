import { test } from './conditions.ts'
import { currentChapter, emit, fail, setFlag, type Ctx } from './context.ts'
import type { Effect } from './schema.ts'

export function runEffects(ctx: Ctx, effects: readonly Effect[]): void {
  for (const effect of effects) {
    if (ctx.state.ended) return
    runEffect(ctx, effect)
  }
}

function runEffect(ctx: Ctx, effect: Effect): void {
  const { state } = ctx
  switch (effect.do) {
    case 'say':
      return emit(ctx, { type: 'say', text: effect.text })
    case 'give':
      if (!state.inventory.includes(effect.item)) state.inventory.push(effect.item)
      return emit(ctx, { type: 'give', item: effect.item })
    case 'take':
      state.inventory = state.inventory.filter(item => item !== effect.item)
      if (state.selected === effect.item) state.selected = null
      return emit(ctx, { type: 'take', item: effect.item })
    case 'setFlag':
      return setFlag(ctx, effect.flag, effect.value)
    case 'open': {
      const entry = ctx.idx.views.get(effect.view)
      if (entry?.wall !== null || entry.room.id !== state.location.room) return fail(ctx, 'UNKNOWN_VIEW', effect.view)
      state.location.closeUps.push(effect.view)
      return
    }
    case 'goto': {
      const entry = ctx.idx.rooms.get(effect.room)
      if (entry?.chapter.id !== state.location.chapter) return fail(ctx, 'UNKNOWN_ROOM', effect.room)
      state.location = { ...state.location, room: effect.room, wall: effect.wall ?? 'n', closeUps: [] }
      return
    }
    case 'sound':
      return emit(ctx, { type: 'sound', sfx: effect.sfx })
    case 'beat':
      return fireBeat(ctx, effect.id)
    case 'endChapter':
      return endChapter(ctx)
  }
}

export function fireBeat(ctx: Ctx, id: string): void {
  const entry = ctx.idx.beats.get(id)
  if (entry?.chapter.id !== ctx.state.location.chapter) return fail(ctx, 'UNKNOWN_BEAT', id)
  if (ctx.state.fired.includes(id)) return
  ctx.state.fired.push(id)
  emit(ctx, { type: 'beat', id })
  runEffects(ctx, entry.beat.do)
}

// Fires `afterFlag` beats for flags changed during this step, until nothing new fires.
export function settle(ctx: Ctx): void {
  let again = true
  while (again && !ctx.state.ended) {
    again = false
    for (const beat of currentChapter(ctx).beats) {
      if (beat.on.type !== 'afterFlag' || ctx.state.fired.includes(beat.id) || !ctx.changed.has(beat.on.flag)) continue
      if (!test(beat.on.when, ctx.state)) continue
      fireBeat(ctx, beat.id)
      again = true
    }
  }
}

export function fireViewBeats(ctx: Ctx, type: 'arrive' | 'leave', view: string): void {
  for (const beat of currentChapter(ctx).beats) {
    const { on } = beat
    if (on.type !== type || on.view !== view || ctx.state.fired.includes(beat.id)) continue
    if (test(on.when, ctx.state)) fireBeat(ctx, beat.id)
  }
}

function endChapter(ctx: Ctx): void {
  const { state, level } = ctx
  const chapter = currentChapter(ctx)
  if (!test(chapter.exitWhen, state)) return fail(ctx, 'EXIT_NOT_MET', chapter.id)
  emit(ctx, { type: 'chapterEnd', chapter: chapter.id })
  const index = ctx.idx.chapters.get(chapter.id)?.index ?? 0
  const next = level.chapters[index + 1]
  if (next) {
    state.location = { chapter: next.id, room: next.start.room, wall: next.start.wall, closeUps: [] }
    state.selected = null
    state.hint = { objective: null, tier: 0 }
    return
  }
  const ending = level.endings.find(e => test(e.when, state)) ?? level.endings[0]
  if (!ending) return
  state.ended = ending.id
  emit(ctx, {
    type: 'ending',
    id: ending.id,
    text: ending.text,
    secretsFound: level.secrets.filter(s => test(s.foundWhen, state)).length,
    secretsTotal: level.secrets.length,
  })
}
