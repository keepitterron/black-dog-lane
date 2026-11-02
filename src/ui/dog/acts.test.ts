import { expect, test } from 'vitest'
import { DOG_POSES } from '../../art/dog.ts'
import { DOG_SOUNDS } from '../../audio/dogSounds.ts'
import { DOG_ACTS } from '../../engine/dog.ts'
import { ACTS, IDLE_POSE } from './acts.ts'

test('every engine dog act has a pose, a known sound and a duration', () => {
  expect(Object.keys(ACTS).toSorted()).toEqual([...DOG_ACTS].toSorted())
  for (const act of Object.values(ACTS)) {
    expect(DOG_POSES).toContain(act.pose)
    if (act.sound) expect(DOG_SOUNDS).toContain(act.sound)
    expect(act.ms).toBeGreaterThan(0)
  }
  expect(DOG_POSES).toContain(IDLE_POSE)
})
