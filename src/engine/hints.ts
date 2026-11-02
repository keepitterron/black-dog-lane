// Hints: asking picks the first available, unfinished objective in declared order and
// escalates through its three tiers, staying on the last.
import { test } from './conditions.ts'
import { emit, type Ctx } from './context.ts'
import { lookup } from './lookup.ts'
import type { Level, Objective } from './schema.ts'
import type { GameState } from './state.ts'
import { NO_HINT } from './text.ts'

// The objective a hint is about right now, or null when nothing is left to do.
export function currentObjective(level: Level, state: GameState): Objective | null {
  const chapter = lookup(level).chapters.get(state.location.chapter)?.chapter
  return chapter?.objectives.find(o => test(o.availableWhen, state) && !test(o.doneWhen, state)) ?? null
}

// The hints already shown for the current objective, so they can be read again.
export function revealedHints(level: Level, state: GameState): string[] {
  const objective = currentObjective(level, state)
  if (!objective || state.hint.objective !== objective.id) return []
  return objective.hints.slice(0, state.hint.tier + 1)
}

export function askHint(ctx: Ctx): void {
  const { state } = ctx
  const objective = currentObjective(ctx.level, state)
  if (!objective) {
    state.hint = { objective: null, tier: 0 }
    return emit(ctx, { type: 'say', text: NO_HINT })
  }
  const tier = state.hint.objective === objective.id ? (state.hint.tier === 0 ? 1 : 2) : 0
  state.hint = { objective: objective.id, tier }
  emit(ctx, { type: 'hint', objective: objective.id, tier, text: objective.hints[tier] })
}
