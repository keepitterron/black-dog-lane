# Next session: Milestones 5 to 9

A handoff for a fresh Claude Code session picking up Black Dog Lane after Milestone 4.1. Read this first, then `CLAUDE.md` (rules, commands), then `docs/handoff.md` (the full spec). This file covers what the spec doesn't: where the code actually stands, decisions already made, known gaps, and a concrete plan for each remaining milestone.

## Where things stand (2 Nov 2026)

Milestones 1 to 4.1 are merged to `main` and deployed to GitHub Pages; the developer has the PWA installed on their phone.

| Milestone | PR | State |
| --- | --- | --- |
| 1 Scaffold, PWA, CI, Pages | #1 | merged |
| 2 Schema + pure engine | #4 | merged |
| 3 The dog | #5 | merged, then removed in 4.1 |
| 4 Waiting Room as level data, scene, game screen, minimal solver | #6 | merged |
| 4.1 Dog removed, prototype puzzles restored | #7 | merged |

What works today: the title screen (original dog silhouette logo, Continue / Start over), and The Waiting Room playing from `levels/test/waiting-room.json` with the prototype's look, sound and puzzles, split into three chapters in one room. Saves, hints, chapter cards, the ending card, portrait and landscape layouts and offline install all work. 80 tests pass, and lint (which is also the type check) is clean.

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

1. If a beat ends a chapter, later `afterFlag` beats from that same step don't fire, because the chapter has already changed. The validator should flag levels that rely on this.
2. The solver has no solution inputs for `slider` and `pattern`; `solutionInputs` returns `[]` for both. Implement them in M5: a small BFS over tile states for the slider, and for patterns, toggle the cells that differ in `single` mode or solve over GF(2) in `cross` mode.
3. Only the dial lock and clock have UI widgets. Sequence, slider, pattern and trail need widgets before a level can use them (M7 at the latest, before M8).
4. There's no level picker yet. `App.tsx` hard-codes the Waiting Room (M6).
5. The spec says multi-room exists, but the Waiting Room is a single room. `goto` works in the engine and is tested, but no fixture uses doors (M6).
6. The `palette` field isn't used; colours are hard-coded in the assets (M7).
7. The landscape layout works but hasn't been tuned on a real device.
8. `Game.tsx` plays hint text as `Hint N of 3: …`. Fine, but the developer hasn't commented on the wording.

## Remaining milestones

### M5: Solver and validator

Goal: `npm run validate -- <file>` prints a spoiler-free report and exits non-zero on failure, and a Vitest suite runs it over every level. Done when the Waiting Room passes and deliberately broken fixtures trigger every error code.

- Build `src/solver/validate.ts` on top of `solve.ts`. Return `{ ok, codes: { code, chapter, ids }[], stats }`. Write `scripts/validate.ts` as a thin CLI around it: it accepts `.json` and `.level`, prints one line per file in the spec's format, and lists failure codes with chapter and ids only. Add `"validate"` to `package.json` scripts.
- Checks, from the spec's table, minus the two dog checks removed in M4.1:
  - `UNSOLVABLE`, `DEAD_END`, `CHAPTER_COUNT` (the schema already enforces this; keep the code for the report).
  - `ORPHAN_HOTSPOT`: a visible hotspot whose rules never change abstract state on any path. Pure-flavour taps that only `say` count as orphans per design rule 1. Note that the Waiting Room has several "look" hotspots that only `say` (soil, glass, note, photo). The note, glass and photo are `looksLikeClue` sources and should count as puzzle inputs. Decide with the developer whether description-only taps are allowed; the prototype has them. The likely answer: allow `say`-only hotspots when they're tagged `looksLikeClue` or their view is a puzzle clue.
  - `FALSE_CLUE`: anything tagged `looksLikeClue` must sit in a view listed in some puzzle's `clues`.
  - `SINGLE_THREAD`: count the objectives available at once along the shortest path.
  - `SINGLE_SOURCE`: a puzzle with fewer than two clue views.
  - `BUSYWORK`: the same hotspot tapped twice in a row with no state change in between, on the shortest path.
  - `HINT_GAP`: a reachable, unfinished state with no available objective. The solver has every state, so check them all.
  - `SECRET_NO_TELL`: the tell layer must have a `visibleWhen`, or params that differ from the other layers in its view.
  - `BEAT_SPARSE`: fewer than one beat per three progress steps on the shortest path.
  - `TAP_TARGET`: use `MIN_TAP_UNITS` from `src/ui/game/hitRect.ts`. Move that constant somewhere the engine and solver can import; it's pure.
  - `LENGTH`: 12 to 25 steps per chapter on the shortest path.

  Per-chapter numbers need the solver to record the shortest path, including where each chapter starts.
- **Expect the Waiting Room to fail some checks honestly.** It has 20 steps over three chapters, so `LENGTH` fails, and some say-only hotspots will be flagged. Talk to the developer before bending the level or the rules. Options: the test fixture opts out of the authoring-style checks (a `validate` profile of `"fixture"` versus `"play"`), or thresholds become per-profile. Real generated levels must pass the strict profile.
- Add `levels/test/broken/*.json`, one minimal fixture per error code, and a Vitest table that asserts each one triggers exactly its code. Exclude `broken/` from `tests/solve.test.ts` and from the "every fixture is valid" test.
- Keep it fast: the Waiting Room solves in about 1 s. Watch the state count when adding per-path analysis, and reuse the BFS graph.

### M6: Three chapters, multi-room, level picker

Goal: a three-chapter test fixture with doors between rooms validates and plays, inventory carries over, and a level picker lists levels.

- Write a second builder-authored fixture (`scripts/levels/two-rooms.ts` → `levels/test/two-rooms.json`): two or three rooms per chapter joined by `goto` doors, using only existing assets. Keep it dull and non-secret.
- Door hotspots probably want art. A `door` asset already exists; a "doorway to another room" variant can come here or in M7.
- Level picker: a title screen list of every level. Test levels are always listed; real levels come from `import.meta.glob('../../levels/play/*.level', { query: '?raw', eager: true })`, decoded with `decodeLevel`. Show the title (decoding at runtime is fine; titles aren't spoilers to the player). Each level keeps its own save and Continue state.
- Precache: hashed level files must reach the service worker's precache list. Raw imports are bundled into JS chunks, so they are already covered; check it.
- Chapter payoffs: the spec wants "each chapter ends with a small payoff". The card currently shows only the next chapter's intro. Consider an optional `outro` text on chapters (a schema addition; mention it in the PR).

### M7: Asset library growth

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
