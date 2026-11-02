// The dog is global: same name, look and sounds in every level. Levels only say what it does.

export const DOG = {
  // Placeholder until the name is decided (open question in docs/handoff.md).
  name: 'Spartacus',
}

// The dog's permanent inventory slot. No level item may use this id.
export const DOG_SLOT = 'dog'

export const DOG_ACTS = ['trot', 'paw', 'sniff', 'fetch', 'bark', 'wag', 'standGuard', 'nuzzle'] as const
export type DogAct = (typeof DOG_ACTS)[number]

export const DOG_ROLES = ['fetch', 'sniff', 'guard', 'hero'] as const
export type DogRole = (typeof DOG_ROLES)[number]

export function fillText(text: string): string {
  return text.replaceAll('{dog}', DOG.name)
}
