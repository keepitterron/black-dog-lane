// The engine: step(level, state, action) → { state, events }. Pure; nothing here knows about
// a specific level. React renders `state`; `events` drive messages, sounds and beats.
import { seenFlag, test } from './conditions.ts'
import { currentChapter, currentViewId, emit, fail, makeCtx, setFlag, type Ctx, type GameEvent } from './context.ts'
import { DOG_SLOT, fillText } from './dog.ts'
import { fireViewBeats, runEffects, settle } from './effects.ts'
import { askDog } from './hints.ts'
import { applyPuzzleInput, type PuzzleInput } from './puzzles.ts'
import { WALLS, type Level } from './schema.ts'
import type { GameState } from './state.ts'
import { DOG_NOTHING, DOG_READY, DOG_WAG, NO_COMBINE, NOTHING_HAPPENS } from './text.ts'

export type Action =
  | { type: 'turn'; dir: 'left' | 'right' }
  | { type: 'open'; view: string }
  | { type: 'back' }
  | { type: 'tapHotspot'; id: string }
  | { type: 'tapItem'; id: string }
  | { type: 'puzzleInput'; puzzle: string; input: PuzzleInput }
  // Sent by the UI once a view has faded in, so arrival beats fire in view.
  | { type: 'arrive' }
  | { type: 'askDog' }

export type StepResult = { state: GameState; events: GameEvent[] }

export function step(level: Level, state: GameState, action: Action): StepResult {
  if (state.ended) return { state, events: [] }
  const ctx = makeCtx(level, state)
  act(ctx, action)
  settle(ctx)
  return { state: ctx.state, events: ctx.events }
}

function act(ctx: Ctx, action: Action): void {
  const { state } = ctx
  const { location } = state
  switch (action.type) {
    case 'turn': {
      if (location.closeUps.length > 0) return
      fireViewBeats(ctx, 'leave', currentViewId(state))
      const at = WALLS.indexOf(state.location.wall)
      state.location.wall = WALLS[(at + (action.dir === 'right' ? 1 : 3)) % 4] ?? 'n'
      return
    }
    case 'open': {
      const entry = ctx.idx.views.get(action.view)
      if (entry?.wall !== null || entry.room.id !== location.room) return fail(ctx, 'UNKNOWN_VIEW', action.view)
      location.closeUps.push(action.view)
      return
    }
    case 'back':
      if (location.closeUps.length === 0) return
      fireViewBeats(ctx, 'leave', currentViewId(state))
      state.location.closeUps.pop()
      return
    case 'arrive': {
      const view = currentViewId(state)
      setFlag(ctx, seenFlag(view), true)
      return fireViewBeats(ctx, 'arrive', view)
    }
    case 'tapHotspot':
      return tapHotspot(ctx, action.id)
    case 'tapItem':
      return tapItem(ctx, action.id)
    case 'puzzleInput': {
      const entry = ctx.idx.puzzles.get(action.puzzle)
      if (entry?.chapter.id !== location.chapter) return fail(ctx, 'UNKNOWN_PUZZLE', action.puzzle)
      if (ctx.idx.views.get(currentViewId(state))?.view.puzzle !== action.puzzle) return fail(ctx, 'PUZZLE_NOT_IN_VIEW', action.puzzle)
      return applyPuzzleInput(ctx, entry.puzzle, action.input)
    }
    case 'askDog':
      return askDog(ctx)
  }
}

function say(ctx: Ctx, text: string): void {
  emit(ctx, { type: 'say', text: fillText(text) })
}

function tapHotspot(ctx: Ctx, id: string): void {
  const { state } = ctx
  const hotspot = ctx.idx.views.get(currentViewId(state))?.view.hotspots.find(h => h.id === id)
  if (!hotspot || !test(hotspot.visibleWhen, state)) return fail(ctx, 'UNKNOWN_HOTSPOT', id)
  const selected = state.selected
  if (selected === DOG_SLOT) {
    state.selected = null
    return sendDog(ctx, id)
  }
  if (selected && !hotspot.accepts?.includes(selected)) {
    state.selected = null
    return say(ctx, NOTHING_HAPPENS)
  }
  const rule = hotspot.rules.find(r => test(r.when, state))
  if (rule) runEffects(ctx, rule.do)
  else if (selected) say(ctx, NOTHING_HAPPENS)
  if (selected && state.selected === selected) state.selected = null
}

// The dog goes to a hotspot or sniffs an item: the first matching, unused dog moment there.
function sendDog(ctx: Ctx, at: string): void {
  const { state } = ctx
  const moment = currentChapter(ctx).dogMoments.find(
    m => m.at === at && !state.fired.includes(m.id) && test(m.when, state),
  )
  if (!moment) return say(ctx, DOG_NOTHING)
  state.fired.push(moment.id)
  runEffects(ctx, moment.do)
}

function tapItem(ctx: Ctx, id: string): void {
  const { state, level } = ctx
  const selected = state.selected
  if (id === DOG_SLOT) {
    if (selected === DOG_SLOT) {
      state.selected = null
      return say(ctx, DOG_WAG)
    }
    if (selected) {
      state.selected = null
      return sendDog(ctx, selected)
    }
    state.selected = DOG_SLOT
    return say(ctx, DOG_READY)
  }
  const item = level.items[id]
  if (!item || !state.inventory.includes(id)) return fail(ctx, 'UNKNOWN_ITEM', id)
  if (selected === id) {
    state.selected = null
    return say(ctx, item.desc)
  }
  if (selected === null) {
    state.selected = id
    return say(ctx, item.name)
  }
  state.selected = null
  if (selected === DOG_SLOT) return sendDog(ctx, id)
  const combo = level.combos.find(c => (c.a === selected && c.b === id) || (c.a === id && c.b === selected))
  if (!combo) return say(ctx, NO_COMBINE)
  runEffects(ctx, [
    { do: 'take', item: combo.a },
    { do: 'take', item: combo.b },
    { do: 'give', item: combo.make },
    { do: 'say', text: combo.say },
  ])
}
