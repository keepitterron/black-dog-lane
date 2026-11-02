import type { Cond } from './schema.ts'
import type { GameState } from './state.ts'

export const seenFlag = (view: string) => `seen:${view}`

// A missing condition always holds.
export function test(cond: Cond | undefined, state: GameState): boolean {
  if (!cond) return true
  switch (cond.op) {
    case 'flag':
      return cond.eq === undefined ? Boolean(state.flags[cond.flag]) : state.flags[cond.flag] === cond.eq
    case 'has':
      return state.inventory.includes(cond.item)
    case 'selected':
      return state.selected === cond.item
    case 'seen':
      return state.flags[seenFlag(cond.view)] === true
    case 'fired':
      return state.fired.includes(cond.id)
    case 'not':
      return !test(cond.cond, state)
    case 'all':
      return cond.conds.every(c => test(c, state))
    case 'any':
      return cond.conds.some(c => test(c, state))
  }
}
