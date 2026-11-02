// Hints: asking picks the first available, unfinished objective in declared order and
// escalates through its three tiers, staying on the last.
import { test } from './conditions.ts'
import { currentChapter, emit, type Ctx } from './context.ts'
import { NO_HINT } from './text.ts'

export function askHint(ctx: Ctx): void {
  const { state } = ctx
  const objective = currentChapter(ctx).objectives.find(
    o => test(o.availableWhen, state) && !test(o.doneWhen, state),
  )
  if (!objective) {
    state.hint = { objective: null, tier: 0 }
    return emit(ctx, { type: 'say', text: NO_HINT })
  }
  const tier = state.hint.objective === objective.id ? (state.hint.tier === 0 ? 1 : 2) : 0
  state.hint = { objective: objective.id, tier }
  emit(ctx, { type: 'hint', objective: objective.id, tier, text: objective.hints[tier] })
}
