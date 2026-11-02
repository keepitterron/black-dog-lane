// Writes the test fixtures that are authored in TypeScript (see scripts/levels/).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { BROKEN } from './levels/broken.ts'
import { strict } from './levels/strict.ts'
import { waitingRoom } from './levels/waiting-room.ts'

export const FIXTURES: Record<string, () => unknown> = {
  'levels/test/waiting-room.json': waitingRoom,
  'levels/test/strict.json': strict,
  ...Object.fromEntries(Object.entries(BROKEN).map(([code, build]) => [`levels/test/broken/${code}.json`, build])),
}

if (import.meta.main) {
  for (const [file, build] of Object.entries(FIXTURES)) {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(build(), null, 2)}\n`)
    console.log(`wrote ${file}`)
  }
}
