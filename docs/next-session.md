# Next session: Milestones 5 to 9

A handoff for a fresh Claude Code session picking up Black Dog Lane after Milestone 4.1. Read this first, then `CLAUDE.md` (rules, commands), then `docs/handoff.md` (the full spec). This file covers what the spec doesn't: where the code actually stands, decisions already made, known gaps, and a concrete plan for each remaining milestone.

## Where things stand (2 Nov 2026)

Milestones 1 to 5 are merged to `main` and deployed to GitHub Pages; the developer has the PWA installed on their phone.

| Milestone | PR | State |
| --- | --- | --- |
| 1 Scaffold, PWA, CI, Pages | #1 | merged |
| 2 Schema + pure engine | #4 | merged |
| 3 The dog | #5 | merged, then removed in 4.1 |
| 4 Waiting Room as level data, scene, game screen, minimal solver | #6 | merged |
| 4.1 Dog removed, prototype puzzles restored | #7 | merged |
| 5 Solver and validator | #9 | merged |
| 6 Multi-room, level picker, chapter outros | #10 | merged |
| 7 Asset catalog, palettes, all puzzle widgets, `/dev/assets` | — | on branch `m7-assets` |

What works today: the title screen (original dog silhouette logo) listing every level with its own Continue / Start over, The Waiting Room playing from `levels/test/waiting-room.json` with the prototype's look, sound and puzzles, split into three chapters in one room, and Two Rooms, a dull fixture with doors between rooms and keys carried between chapters. Saves, hints, chapter cards, the ending card, portrait and landscape layouts and offline install all work. 137 tests pass, and lint (which is also the type check) is clean.

Open housekeeping:

- **Vitest 5** landed on `main` via Dependabot (#2), replacing the spec's Vitest 4. All tests pass on it; `CLAUDE.md` is updated.
- **Dependabot PR #3** bumps `@types/node` 24 → 26. The runtime is Node 24 (`.nvmrc`), so the types should stay on 24. Suggest closing it and adding an `ignore` for `@types/node` major versions in `.github/dependabot.yml`.

## Working agreements with the developer

- **The surprise protocol is absolute** (see `CLAUDE.md`). Never print real level content anywhere. Never read `levels/play/**`. Test levels in `levels/test/` are fine to read and show.
- **No dog in levels.** The animated helper dog was built in M3–M4 and removed in M4.1 because it broke the creepy tone. The dog is only the logo (`src/art/dogMark.ts`). Don't add dog mechanics, poses or sounds unless the developer asks.
- **One branch per milestone**, cut from a freshly pulled `main` (`m5-validator`, `m6-multi-room`, …). Committing on the branch is fine. **Ask before pushing or opening a PR.**
- **PR descriptions** follow the developer's global preferences: brief, no headings, why plus what behaves differently plus anything surprising, a before/after table when that's clearer. No file lists, test plans or tool attribution. Title: `Milestone N: …`.
- **Check UI work in the in-app browser at phone size** (375×812, plus a landscape pass) before calling it done. Use `.claude/launch.json` → `dev` (port 5173). The production `preview` server registers the service worker, which can serve stale builds.
- **The developer playtests** only at the marked milestones (M9, plus anything that changes how a level feels). Say plainly what you couldn't check, especially sound.
- **Ask before changing the spec's direction.** Small, level-agnostic engine additions have been fine when they're explained in the PR.

## Codebase map and decisions already made

- **`src/engine/`**: pure TypeScript, no React or DOM. Oxlint enforces this with `no-restricted-imports` and `no-restricted-globals` overrides.
  - `schema.ts` is the single source of truth. Valibot strict objects, so unknown keys fail. Conditions use an `op` key and effects a `do` key (more explicit than the spec's sketch, and easy to turn into a JSON schema for the generator).
  - Additions beyond the spec:
    - `chapter.start`, the starting room and wall;
    - `visibleWhen` on hotspots;
    - `activeWhen` / `inactiveSay` on puzzles;
    - a `when` condition on `afterFlag` triggers;
    - `room.ambient`, looping sounds;
    - the puzzle kind `trail`, formerly `scent`.
  - `step.ts` is the reducer: `step(level, state, action) → { state, events }`. It clones the state, so it's pure. The actions are turn, open, back, tapHotspot, tapItem, puzzleInput, arrive and hint.
  - `effects.ts` handles effects, beats, chapter flow and endings. `refs.ts` checks cross-references (ids must exist and be unique, puzzle shapes must be consistent). `codec.ts` does gzip + base64 with web streams and reports spoiler-free parse errors.
  - `save.ts` stores one save per level id, with the save version inside it (`SAVE_VERSION` is 2 since M4.1). Any mismatch loads as `mismatch`, which offers Start over.
- **`src/solver/solve.ts`**: breadth-first search that drives the real engine over abstract states (chapter + flags + inventory + fired). Any view in the chapter counts as reachable, so levels must gate progress with conditions, not with navigation.
  - The search key keeps only gameplay-relevant state: flags read by gameplay conditions, puzzle state, the inventory, and beats whose firing changes state. That is what keeps the Waiting Room at about 2,300 states, solved in about 1 s.
  - A puzzle's solve action requires its `clues` views to have been seen.
  - It reports `solvable`, `shortest`, `states`, `deadEnds` and `truncated`. `deadEndSamples` exists for debugging test levels only.
- **`src/art/`**: `kit.ts` holds the helpers, the asset contract `(params, { flags }) → SVG` and the shared `SCENE_DEFS`. `assets/` holds 26 assets ported from the prototype, registered in `assets/index.ts`. `icons.ts` holds the inventory icons.
  - Convention: params ending in `Flag` name a flag the asset reacts to (`litFlag`, `openFlag`, …). Clock assets read puzzle state from the flags `<puzzle>:h` and `<puzzle>:m`.
- **`src/ui/game/`**:
  - `Scene.tsx` draws art layers, then padded hotspot rects (`hitRect.ts` enforces 44 px at a 360 px width), then the puzzle widget on top. Hotspot rects carry `data-hotspot` for testing.
  - `PuzzleWidget.tsx` only has dial lock and clock.
  - `Game.tsx` runs the engine, saves after every step, and plays events on a small timeline: a beat pauses 350 ms, text lines queue, chapter cards and the ending wait for the text to finish.
- **`scripts/levels/waiting-room.ts`** builds the Waiting Room; `npm run fixtures` writes the JSON, and `tests/fixtures.test.ts` fails if they drift. Edit the builder, never the JSON. Because ids must be unique, each chapter has its own copy of the room (`room1`, `room2`, `room3`, with hotspots suffixed by chapter), all reading the same flags.
- **Tests**:
  - `tests/fixture.ts` has `baseLevel()` and `play()` for engine tests.
  - `tests/levels.test.ts` validates every level: schema, references and art that exists. It decodes `levels/play/*.level` when there are any, and is skipped otherwise.
  - `tests/solve.test.ts` requires every test level to be solvable with no dead ends.
  - `tests/walkthrough.test.ts` plays `basic.json` end to end.
- **Tooling gotchas**:
  - The service worker lives in `src/sw/` with its own `tsconfig.json` (WebWorker lib), referenced from the root.
  - Files in `public/` must be listed in `PUBLIC_FILES` in `vite.config.ts` to be precached.
  - `scripts/*.ts` run directly under Node 24 type stripping, so imports need `.ts` extensions.
  - `@types/node` is an approved extra dev dependency.
  - Icons regenerate with `node scripts/icons.ts` (needs `rsvg-convert`).
- **Browser testing trick**: to jump into a level state, write a save to `localStorage['bdl:save:waiting-room']` (version 2, a full `GameState`) and reload; the title shows Continue. For a hotspot's screen position, call `document.querySelector('[data-hotspot="id"]').getBoundingClientRect()`. Only do this with test levels.

## Known gaps to keep in mind

1. If a beat ends a chapter, later `afterFlag` beats from that same step don't fire, because the chapter has already changed. The validator reports this as `BEAT_LOST`.
2. ~~Only the dial lock and clock have UI widgets~~ (done in M7).
3. ~~No level picker~~ (done in M6).
4. ~~No fixture uses doors~~ (done in M6: `two-rooms.json`). The solver models rooms only through doors that would open in a state; a door that needs an item *selected* (rather than a flag) doesn't count as open, so levels should open doors with a flag.
5. ~~The `palette` field isn't used~~ (done in M7).
6. The landscape layout works but hasn't been tuned on a real device.
7. `Game.tsx` plays hint text as `Hint N of 3: …`. Fine, but the developer hasn't commented on the wording.

## Remaining milestones

### M5: Solver and validator (done)

`npm run validate -- [--fixture] <file…>` and `validate(level, { profile })` in `src/solver/validate.ts`, over one `explore()` graph from `solve.ts`. Decisions made with the developer:

- **Profiles.** `play` (the default, binds every real level) runs every check. `fixture` skips the rules about what a tap or clue must lead to (`ORPHAN_HOTSPOT`, `FALSE_CLUE`) and the pacing checks (`LENGTH`, `SINGLE_THREAD`, `SINGLE_SOURCE`, `BUSYWORK`, `BEAT_SPARSE`). The Waiting Room keeps its description taps and per-chapter room copies, and passes `fixture` unchanged.
- **Say-only hotspots** are allowed only when they're tagged `looksLikeClue` or sit in a puzzle's clue view. Hotspots that `open` or `goto` somewhere with content count as navigation, and hotspots that are never visible aren't checked.
- **`TAP_TARGET`** fails when a padded rect leaves the 800×600 scene, or when hotspots drawn on top of it (and visible at the same time) leave it less than half a minimum tap target of free area. Nesting a small target on a big one is fine.
- **`BUSYWORK`** flags the same tap (hotspot + item) twice on a chapter's shortest path. Adjacency would depend on which order BFS picks for independent steps.
- **Extra codes:** `SCHEMA` (parse failures, dot paths only), `TRUNCATED` (state cap hit, nothing proved), `BEAT_LOST` (known gap 1), plus the ref codes from `refs.ts`.
- `LENGTH` counts every state-changing step on the shortest path, including looking at clue views. `BEAT_SPARSE` counts beats fired by steps, plus arrive and leave beats whose condition holds along the path.
- Sliders are solved with A* after a parity check, and `cross` patterns over GF(2).
- The Waiting Room validates in about 1.3 s (2,270 states), and `strict.json` in about 0.4 s.

### M6: Three chapters, multi-room, level picker (done)

- `two-rooms.json` passes the `play` profile: two rooms per chapter, ungated doors both ways, a key from each chapter used in the next, outros on chapters 1 and 2. New positionable assets `doorway` and `frame` (a framed panel, optionally showing a code symbol).
- `chapter.outro` (optional, ≤140 chars) shows on the card between chapters. The `play` profile requires it on chapters 1 and 2 (`NO_PAYOFF`).
- The solver acts only in rooms reachable through doors whose rule would fire; `ONE_WAY_DOOR` and `ROOM_UNREACHABLE` keep that honest.
- The picker lists real levels, then the Waiting Room and Two Rooms; `basic` and `strict` only in dev. Shown fixtures and raw `.level` imports land in the main JS chunk, which the precache plugin lists.

Original plan:

Goal: a three-chapter test fixture with doors between rooms validates and plays, inventory carries over, and a level picker lists levels.

- Write a second builder-authored fixture (`scripts/levels/two-rooms.ts` → `levels/test/two-rooms.json`): two or three rooms per chapter joined by `goto` doors, using only existing assets. Keep it dull and non-secret.
- Door hotspots probably want art. A `door` asset already exists; a "doorway to another room" variant can come here or in M7.
- Level picker: a title screen list of every level. Test levels are always listed; real levels come from `import.meta.glob('../../levels/play/*.level', { query: '?raw', eager: true })`, decoded with `decodeLevel`. Show the title (decoding at runtime is fine; titles aren't spoilers to the player). Each level keeps its own save and Continue state.
- Precache: hashed level files must reach the service worker's precache list. Raw imports are bundled into JS chunks, so they are already covered; check it.
- Chapter payoffs: the spec wants "each chapter ends with a small payoff". The card currently shows only the next chapter's intro. Consider an optional `outro` text on chapters (a schema addition; mention it in the PR).

### M7: Asset library growth (done)

- `src/catalog/assets.ts` is the machine-readable catalog for M8: per asset its kind, a neutral description, typed params (`ParamSpec`), flags, bbox, anchor and slots. `paramProblems()` and `placedRect()` live there too, so the solver can use them without importing art.
- Placement: `slot` fits the bbox into a slot's width keeping the drawn height (`floor` and `ceiling` also fix the height); `atX`/`atY` put the anchor point anywhere (props on a desk). Unplaced prototype assets draw exactly as before; a hash test pins the Waiting Room.
- Seven palettes (`waiting`, `plain`, `attic`, `cellar`, `nursery`, `study`, `ash`) and four wallpaper motifs (`roomShell` `pattern`).
- New: 11 furniture pieces, 12 props (also icons), 7 close-up templates (book spread, container with up to three props, fog glass, note, mirror, widget panel, music box), and `trailMark`.
- Widgets for sequence, slider and pattern; trails tap `trailMark` layers on walls. Engine change: a trail tap counts only on the view it names, instead of needing the view to declare the puzzle; the solver walks a trail as one step.
- `ASSET_REF` (both profiles) with its broken fixture.

Original plan:

Goal: the furniture, props, close-up templates and palettes listed in the spec's "Art and audio" section, plus a preview page at `/dev/assets` in dev builds only.

- Keep the prototype's style: flat, muted, hand-drawn feel, IM Fell English. No raster images. Every asset is `(params, { flags }) → SVG` and gets registered in `assets/index.ts`.
- Palettes: token sets (wall, wood, metal, cloth, light, ink) chosen by `level.palette`. Thread the palette through `AssetCtx` (for example `ctx.palette`) and replace hard-coded colours in the existing assets gradually. The Waiting Room becomes palette `waiting`.
- Missing puzzle widgets: sequence, slider, pattern and trail. Give each a fixed close-up layout like the dial lock and clock. Trail: marks appear across walls in order; the input is `{ kind: 'trail', view }`. Decide how the player taps a mark (probably a hotspot-like target the widget draws on wall views).
- `/dev/assets`: a dev-only route (gate on `import.meta.env.DEV` so it is tree-shaken from production) that renders every asset with a few param presets, so the developer can eyeball the catalog.
- Make the asset catalog machine-readable for the generator: ids, params with types, named states, and which slot (left, centre, right, floor, ceiling) each asset fits. The M8 prompt needs it.

### M8: Generator

Goal: `npm run gen -- "<theme>"` produces a validated, encoded three-chapter level on branch `level/<id>` and opens a PR, without anyone reading it. Done when three themes generate, validate, merge and deploy unread.

- Follow the spec's pipeline:
  1. Graph design with `claude-sonnet-5-5`.
  2. Solver repair loop (max 3 rounds).
  3. Words with `claude-haiku-5-5`.
  4. Deterministic layout into wall slots, with hotspot rects from asset bounding boxes.
  5. Final validation and encoding to `levels/play/<id>.level`.
  6. Branch, commit, `gh pr create`, with the title `Add level: <title>` and the validator report as the body.
- Use plain `fetch` to the Messages API, prompt caching on the large static prefix (schema, asset catalog, widget library, design rules), and structured output with a JSON schema derived from the Valibot schema. Write a price table in `scripts/prices.ts` and print the token and cost report. Load the `claude-api` skill before writing API code, for current model ids, params and caching details.
- The design rules in `docs/handoff.md` go verbatim into the prompt; the dog rules are already gone.
- **The surprise protocol bites here.** The script must never print model output, level JSON or text, only counts, ids and codes. You must never run it on a real theme yourself in a way that shows output. Develop it against stub API responses and test fixtures. The developer runs real generations (`node --env-file=.env scripts/generate.ts`). The `.claude/settings.json` deny rules cover only the Read, Edit and Write tools on `levels/play/**`, so don't `cat` those files either.
- Repair loop: feed back only error codes and ids, never text.
- Commit only the encoded file on the level branch.

### M9: First real level

The developer and their daughter pick a theme; the developer runs the generator; the PR merges unread; they play it blind. Feedback goes into the design rules and validator checks, never into the level by hand. Your job here is mostly reacting to feedback described in non-spoiler terms, and fixing bugs reported by level, chapter, room and puzzle id.

## Verifying anything

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run fixtures
```

Then open the `dev` server in the in-app browser at 375×812 and play the changed part. Clear `localStorage` or inject a save to jump in.
