// Writes the test fixtures that are authored in TypeScript (see scripts/levels/).
import { writeFileSync } from 'node:fs'
import { waitingRoom } from './levels/waiting-room.ts'

export const FIXTURES = { 'levels/test/waiting-room.json': waitingRoom }

if (import.meta.main) {
  for (const [file, build] of Object.entries(FIXTURES)) {
    writeFileSync(file, `${JSON.stringify(build(), null, 2)}\n`)
    console.log(`wrote ${file}`)
  }
}
