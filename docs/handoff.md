# Black Dog Lane: Claude Code handoff

Nov 2, 2026 · @Claude Semeraro

## Context and goals

Build **Black Dog Lane**: a data-driven, Rusty Lake-style point-and-click puzzle game as a Vite + React PWA, plus a local pipeline that generates new themed levels whose story and puzzles stay a surprise to the developer. The black dog is the game's logo, not a character in it (see The logo).

**Who it's for.** A parent (the developer) and a 9-year-old playing together, mostly on a phone (tablet second). One taps, the other spots clues. They loved Samsara Room and Little Nightmares: unsettling, implied threat, no gore. Language is English.

**What the prototype proved.** A single-file HTML test room ("The Waiting Room") validated the mechanics and tone. Copy it into the repo at `docs/reference/prototype.html` and treat it as the behavioural spec for the engine: four walls, close-ups, inventory with select-then-tap and item combining, room-wide state changes, three-tier hints, a secret with a visible tell, scripted creepy beats, synthesized audio, autosave.

**Goals**

1. Port the prototype into a typed engine where every level is pure data, with no level-specific code.
2. Every level is exactly three chapters, each with one or more rooms, with inventory and flags carried between chapters.
3. Generate a new themed level locally from a one-line theme, validate it automatically, open a PR, merge, deploy, all without the developer reading it.
4. Ship as an installable offline PWA on GitHub Pages from the private repo `black-dog-lane`.
5. Keep dependencies to the essentials (list under Tech stack).

**Non-goals for v1:** multiplayer, accounts, a level editor UI, raster or AI-generated images, generation in CI or in the browser.

## Surprise protocol

The developer plays every real level blind, so Claude Code must never surface story or puzzle content to him. These rules apply to every session, every test and every log.

- **Never print level content.** Don't echo level JSON, puzzle solutions, story text, item names or hint text into the chat, a commit message, a PR description, a CI log or a test name. Refer to puzzles and objects by opaque id only (`p07`, `obj12`).
- **Never read real levels unless told to.** Development and debugging happen against `levels/test/` (dull, non-secret fixtures). Real levels live in `levels/play/` and are only touched by the generator, the validator and the build.
- **Real levels are stored encoded.** `levels/play/*.level` is gzip + base64 of the JSON, written by the generator and decoded in the app with the native `DecompressionStream`. It isn't security; it means a PR diff or a stray `cat` shows noise, not a story.
- **Level PRs are spoiler-free.** A generated level arrives as a PR containing only the encoded file. Title `Add level: <title>`, body = the validator report. The developer merges without reading the diff.
- **Spoiler-free reports.** The validator and generator output only counts, ids, pass/fail and error codes, e.g. `chapter 2: 19 steps, 3 threads, 2 secrets, 0 dead ends, hints OK`.
- **Bugs are reported by id.** A runtime error names the level, chapter, room and puzzle id, never what the puzzle is. Fixes inside a real level are made without describing the change in content terms.
- **Hard mode:** add `levels/play/**` as a read-deny rule in the project's Claude Code permissions (`.claude/settings.json`), so a session can't open it by accident; the generator writes there via a script, not by hand.

## Tech stack and tooling

Use the VoidZero toolchain end to end (Vite 8 with Rolldown + Oxc, Oxlint type-aware, Vitest 4) on TypeScript 7, with npm and the smallest dependency set that does the job. Pin exact versions; Dependabot bumps them.

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node 24 LTS | Pin in `.nvmrc` and `engines`. Runs `scripts/*.ts` directly with Node's built-in type stripping, so no `tsx`. |
| Package manager | npm | `package-lock.json` committed; `npm ci` in CI. |
| Build | Vite 8 + `@vitejs/plugin-react` v6 | Rolldown bundler, Oxc transforms, no Babel. `base: '/black-dog-lane/'`. |
| UI | React 19 | Function components, `useReducer` over the engine; no state, router or UI libraries. |
| Language | TypeScript 7 (native `tsc`) | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: bundler`, `target: ES2024`. |
| Lint + types | Oxlint + `oxlint-tsgolint` v7 | `oxlint --type-aware --type-check` replaces a separate `tsc --noEmit`. Plugins: `typescript`, `react`, `react-hooks`, `unicorn`, `import`; `no-floating-promises` on. |
| Schema | Valibot | Validates level files and LLM output; types inferred from the schema. |
| Tests | Vitest 4, node environment | Engine, solver, schema and level tests are pure TS. No DOM testing libraries. |
| PWA | Hand-written | `public/manifest.webmanifest`, `src/sw.ts` (cache-first, versioned cache) and a \~30-line inline Vite plugin in `vite.config.ts` that emits the precache list of hashed files. No Workbox or PWA plugin. |
| CSS | Plain modern CSS, CSS Modules | Cascade layers, native nesting, custom properties, container queries, `dvh`, `color-mix()`, `@property`. No Tailwind. |
| JS style | Modern ESM only | `structuredClone`, `Object.groupBy`, `toSorted`/`with`, `Set` methods, top-level await in scripts. |
| Claude API | Plain `fetch` | Messages API with JSON-schema output; no SDK. |
| Compression | Native | `CompressionStream`/`DecompressionStream` in the browser, `node:zlib` in scripts. |

**The whole dependency list:** `react`, `react-dom`, `valibot`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `oxlint`, `oxlint-tsgolint`, `vitest`. Anything new needs a one-line justification in its PR.

Versions as of this doc: [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [Oxlint type-aware stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable), [Vite 8](https://vite.dev/blog/announcing-vite8.html). Check npm for the latest patches before scaffolding.

## Repository structure

One package, with a hard boundary: `src/engine` imports nothing from React or the DOM, so the same code runs in the browser, in tests and in the validator.

```
black-dog-lane/
├─ .github/workflows/      ci.yml · deploy.yml
├─ .claude/settings.json   permissions (deny reading levels/play/**)
├─ CLAUDE.md               short version of this doc + the surprise protocol
├─ docs/reference/prototype.html
├─ levels/
│  ├─ test/                non-secret JSON fixtures (the prototype port lives here)
│  └─ play/                generated levels, encoded .level files — never read, never printed
├─ public/                 manifest.webmanifest, icons
├─ scripts/
│  ├─ validate.ts          spoiler-free solvability report for any level file
│  ├─ generate.ts          theme → validated level → branch + PR
│  └─ prices.ts            token price table for the cost report
├─ src/
│  ├─ engine/              pure TS: types, schema, reducer, conditions, effects, hints
│  ├─ solver/              state-graph search used by validate.ts and tests
│  ├─ art/                 parametric SVG asset library + palettes
│  ├─ audio/               Web Audio synth: drone, sfx, beats
│  ├─ ui/                  React: Scene, Inventory, Hud, Title, LevelPicker, Ending
│  ├─ styles/              layers.css, tokens.css, base.css
│  ├─ sw.ts                service worker
│  └─ main.tsx
├─ tests/                  cross-cutting tests (all levels valid, schema round-trip)
├─ .env.example            ANTHROPIC_API_KEY= (real .env is git-ignored)
├─ .oxlintrc.json · tsconfig.json · vite.config.ts · vitest.config.ts
└─ package.json
```

## Engine architecture

The engine is a pure reducer: `step(level, state, action) → { state, events }`. React renders `state`; `events` drive transient things like messages, sounds and beats. Nothing in the engine knows about a specific level.

**State** (serialisable, versioned for saves):

- `location`: chapter id, room id, wall (`n` | `e` | `s` | `w`), and a close-up stack (array of view ids, so a photo inside a drawer works and Back pops one level).
- `inventory`: ordered item ids; `selected`: item id or null.
- `flags`: `Record<string, boolean | number | string>`; puzzle state (dial values, clock hands) lives here too.
- `fired`: ids of beats and one-shot effects already triggered.
- `hint`: current objective id + tier.

**Actions:** `turn(dir)`, `open(viewId)`, `back()`, `tapHotspot(id)`, `tapItem(id)`, `puzzleInput(puzzleId, input)`, `arrive()` (emitted after navigation so arrival beats can fire), `hint()` (asks for the next hint tier).

**Interaction model** (from the prototype, keep it exactly):

- Tap an item once to select it and see its name; tap again to read its description and deselect.
- With an item selected, tapping another item tries a combine; tapping a hotspot tries a use. A hotspot that doesn't accept items says "Nothing happens." and deselects.
- Swipe or arrows turn between walls; Back leaves a close-up. Keyboard: arrows and Escape.

**Rules are data.** Each hotspot has an ordered list of `rules`; the first whose `when` condition passes runs its `do` effects. Conditions are a tiny expression tree (`flag`, `has`, `selected`, `not`, `all`, `any`, `fired`). Effects are a closed set: `say`, `give`, `take`, `setFlag`, `open`, `goto`, `sound`, `beat`, `endChapter`. No `eval`, no code in levels.

**Rendering:** a `Scene` component builds one SVG per view from the level's layer list (asset id + params + an optional `visibleWhen` condition), then overlays the lighting layer and transparent hotspot rects last so art never blocks taps. Fade 150 ms between views; respect `prefers-reduced-motion`.

**Phone-first layout.** Portrait: the 4:3 scene full width at the top, the inventory strip and HUD below it. Landscape: the scene fills the height, inventory as a vertical strip at the side. Use container queries on the app shell, `dvh` units and safe-area insets. Every hotspot gets invisible padding up to 44 CSS px at a 360 px-wide screen; the validator enforces it. Text messages sit over the bottom of the scene, 17–19 px.

**Saving:** `localStorage` keyed by level id and save schema version, wrapped in try/catch, with Continue / Start over on the title screen. A version mismatch offers Start over rather than crashing.

## Level format

A level is one JSON file validated by a Valibot schema; TypeScript types are inferred from it, so the schema is the single source of truth for the engine, the validator and the generator.

```ts
type Level = {
  id: string; schema: 1; title: string; theme: string
  palette: PaletteId
  items: Record<ItemId, { name: string; desc: string; icon: AssetRef }>
  combos: { a: ItemId; b: ItemId; make: ItemId; say: string }[]
  chapters: [Chapter, Chapter, Chapter]       // always exactly three
  secrets: { id: string; tell: string }[]     // every secret declares its visible tell
  endings: { id: string; when: Cond; text: string }[]
}
type Chapter = { id: string; intro: string; rooms: Room[]; puzzles: Puzzle[]
                 beats: Beat[]; objectives: Objective[]
                 exitWhen: Cond }
type Room = { id: string; walls: Record<'n'|'e'|'s'|'w', View>; closeUps: Record<ViewId, View> }
type View = { layers: Layer[]; hotspots: Hotspot[] }
type Layer = { asset: AssetRef; params?: Record<string, number|string>; visibleWhen?: Cond }
type Hotspot = { id: string; rect: [x: number, y: number, w: number, h: number]
                 accepts?: ItemId[]; rules: { when?: Cond; do: Effect[] }[] }
type Puzzle = DialLock | ClockSet | Sequence | Slider | Pattern | Scent   // typed widgets
type Beat = { id: string; on: Trigger; once: true; do: Effect[] }
type Objective = { id: string; doneWhen: Cond; availableWhen: Cond
                   hints: [string, string, string] }
```

**Puzzle widgets** are a closed library so the generator can't invent unplayable mechanics: dial lock (N dials over a symbol set), clock set (hours + minutes), sequence (tap objects in order), sliding tiles, pattern match (light up a grid), and trail (follow marks across walls, in order, to a hidden spot). Each declares its solution in data so the solver can check it.

**Beats** fire on `afterEffect` (immediately after a given flag flips, in view), `arrive` (first arrival on a wall after a condition) or `leave` (when you turn away from a wall, the change is seen on return). A beat is always loud: a sound sting plus a line of text.

**Objectives** drive the hints. Several can be available at once (parallel threads); asking for a hint picks the first available, unfinished one in declared order and escalates through its three tiers.


## Validator and solver

The validator replaces human playtesting: it proves a level can be finished, can't get stuck, and that its hints and design rules hold, then reports only numbers and ids.

**How it works.** Abstract the state to `flags + inventory + fired` (ignore location: any view is reachable). Generate actions from every hotspot × (no item | each held item), every combine, and every puzzle's declared solution input. Breadth-first search over abstract states, deduplicated by a canonical hash. Puzzle widgets contribute one "solve" action whose precondition is that the clue objects for it have been seen (`seen:<viewId>` flags), so the solver models looking as well as doing.

**Checks (each a named error code):**

| Code | Fails when |
| --- | --- |
| `UNSOLVABLE` | No path reaches every chapter's `exitWhen` and an ending. |
| `DEAD_END` | Some reachable state can no longer reach the exit (e.g. an item consumed too early). |
| `CHAPTER_COUNT` | The level doesn't have exactly three chapters. |
| `ORPHAN_HOTSPOT` | A tappable hotspot never changes state or gives progress on any path (catches "cage does nothing"). Pure-flavour objects must be non-interactive layers instead. |
| `FALSE_CLUE` | An object tagged `looksLikeClue` (stopped clock, number, symbol) isn't an input to any puzzle. |
| `SINGLE_THREAD` | Fewer than 2 objectives are available at once for most of a chapter. |
| `SINGLE_SOURCE` | A puzzle's solution is fully stated by one object (no clue combining). |
| `BUSYWORK` | A hotspot needs repeated identical taps to progress. |
| `HINT_GAP` | Some reachable, unfinished state has no available objective. |
| `SECRET_NO_TELL` | A secret's object has no layer whose visibility or look differs from its neighbours. |
| `BEAT_SPARSE` | Fewer than 1 beat per \~3 progress steps, or a beat that can fire off-screen. |
| `TAP_TARGET` | A hotspot is smaller than 44 CSS px at a 360 px-wide screen. |
| `LENGTH` | A chapter outside 12–25 steps on the shortest path. |
| `ONE_WAY_DOOR` | A door into a room with no way back through doors that are always open. |
| `ROOM_UNREACHABLE` | No door ever leads to a room. |
| `NO_PAYOFF` | Chapter 1 or 2 has no `outro` (the ending is chapter 3's payoff). |

**Output** (stdout, CI and PR body): `levels/play/foo.level  OK  3 chapters · 61 steps · threads 2–3 · secrets 2 · beats 19 · states 4,812`. On failure: the code, the chapter and the opaque ids involved, never text.

A Vitest suite runs the validator over every file in `levels/`, so CI fails on a broken level the same way it fails on broken code.

## Art and audio

Art comes from a hand-built library of parametric SVG assets, never generated per level. That keeps the look consistent, costs nothing per level, and gives the generator a fixed vocabulary it can't break.

**Style:** flat, hand-drawn feel, muted palette, no pixel art. Carry over the prototype's look: patterned wallpaper, plank floor, candle-light radial overlay, a dark vignette before the light changes. Font: IM Fell English with a Georgia fallback.

**Assets** are pure functions `(params, state) → SVG string`, each with a typed param schema and a list of named states. Start with what the prototype already draws, then grow:

- Room shell: wallpaper (pattern, tint), floor, skirting, window, door (closed, ajar, open-to-dark), curtains.
- Furniture: desk with drawer, bookshelf (seeded books + one marked book), wall clock with pendulum case, birdcage, coat hook + coat, plant pot, rug, chair, mirror, cabinet, bed, wardrobe, piano.
- Props: candle, photograph (renders a mini scene), note, matchbox, keys, portrait (face with eye states, head tilt), music box, jar, dolls, masks, toys, ball, bone, collar, lead, food bowl, paw-print trail.
- Close-up templates: lock plate with N dials + keyhole, clock face with winding holes, open book spread, drawer interior, fogged glass with symbols.
- Symbol set for codes: moon, eye, key, bird, sun, star, hand, fish, tree, crown, paw, bone.

**Palettes** are token sets (wall, wood, metal, cloth, light, ink) chosen per level theme; components read them as CSS custom properties.

**Audio** stays synthesized with Web Audio (no files): a low drone per room, SFX (turn, pick up, click, unlock, strike, sand, chime, knock, footsteps, whisper, music box, sting) Beats reference SFX by id; volume and mute in the HUD. Start audio only after the first user gesture; on iOS, resume the `AudioContext` on every tap until it reports `running`.

## Level generator

`npm run gen -- "<theme>"` runs on the developer's machine and turns a one-line theme into a validated, encoded three-chapter level on its own branch with a PR. It uses the Claude API and prints only a spoiler-free report. The model never writes coordinates or SVG; it designs and writes, code does the rest.

**Pipeline**

1. **Design the puzzle graph.** One call to `claude-sonnet-5-5` with the theme, the asset catalog, the puzzle-widget library and the design rules. It returns structured JSON: three chapters, their rooms, which assets go on which wall, objectives and dependencies, puzzle instances with solutions, clue sources, beats and secrets. No prose yet.
2. **Validate the graph.** Run the solver on the abstract graph. If any check fails, send the error codes and ids back for a repair pass (max 3 rounds, then abort with the codes).
3. **Write the words.** One call to `claude-haiku-5-5` fills every `say`, item name and description, note text, chapter intros, endings and the three hint tiers per objective, keeping the tone rules. Messages are length-checked (≤ 140 characters, so they fit a phone).
4. **Lay out the rooms.** Deterministic code places assets into wall slots (left, centre, right, floor, ceiling) and derives hotspot rects from each asset's bounding box, padded to the tap-target minimum. Seeded, so re-running is reproducible.
5. **Final validation** of the full level, then gzip + base64 it to `levels/play/<id>.level`.
6. **Open the PR.** Create branch `level/<id>`, commit only that file with message `Add level <id>`, push, and run `gh pr create` with the title `Add level: <title>` and the validator report as the body. Without the GitHub CLI installed, print the branch name and stop.

**Keeping it cheap**

- Put the large, static part of the prompt (schema, asset catalog, widget library, design rules) first and mark it for prompt caching, so repeated generations pay mostly for the theme and the output.
- Use structured outputs / a JSON schema derived from the Valibot schema so responses parse first time; reject and repair rather than retry blindly.
- Use the cheaper model for words and repairs; reserve the larger one for the graph design.
- Print input/output tokens and an estimated cost per run from a price table in `scripts/prices.ts`, so the actual cost is visible before scaling up.
- See the [Claude API docs](https://docs.claude.com/en/api/overview) for prompt caching, structured outputs and the Batch API (useful for generating several levels overnight at lower cost).

**Running it without seeing it.** Put `ANTHROPIC_API_KEY` in a git-ignored `.env` and run the script via `node --env-file=.env scripts/generate.ts`. CI validates the PR again; merging to `main` deploys. The new level appears in the in-game level picker by its title. Don't open the PR's Files tab; there's nothing readable in it anyway.

## The logo

The black dog is the game's logo and nothing more: the silhouette on the title screen and in the app icons (`src/art/dogMark.ts`, rendered to `public/icons` by `scripts/icons.ts`). It isn't a character in levels and has no mechanics.

An animated, posable helper dog was built in Milestone 3 and wired into the engine in Milestone 4. Playtesting showed it made the rooms goofy and less unsettling, so Milestone 4.1 removed it. If a dog ever returns to the levels it will be designed from scratch, most likely as quiet background art in the same style as the rooms, not as a helper.

## Puzzle design rules

These came out of playtesting the prototype; they go verbatim into the generator prompt, and the validator enforces the ones it can.

1. **Everything you can tap pays off.** Each interactive object feeds a puzzle, now or later. Pure atmosphere is drawn but not tappable.
2. **If it looks like a clue, it is one.** A stopped clock, a number, a symbol or a marked object is always an input to a puzzle. The first prototype's stopped clock that meant nothing was the most confusing thing in it.
3. **Two or three threads open at once.** Players can switch when stuck, and two people can chase different threads. Threads interlock: one needs a clue only the other gives.
4. **Combine clues.** Answers come from two sources together (a note that says the writing is reversed + the writing itself), never one object stating the code.
5. **12–25 meaningful steps per chapter, three chapters per level.** No busywork: no repeated taps, no pixel hunting, no long walks between walls for nothing. Each chapter ends with a small payoff; chapter 3 resolves the story.
6. **One transforming moment per chapter.** A light, a time shift, a mirror: the room changes and old objects mean something new.
7. **Creepiness is scripted and obvious.** Beats fire right after progress, in view or on the next wall you turn to, always with a sound sting and a line of text. Things move when you look away. Unsettling and implied, never gory or violent; nobody is hurt on screen. Benchmark: Little Nightmares and Rusty Lake.
8. **Secrets have tells.** A small visible oddity (an eye that catches the light, a slightly different colour) rewards curiosity; the ending acknowledges secrets found.
9. **Hints in three tiers:** a nudge, a pointer to the object, then the answer.
10. **Readable for a 9-year-old on a phone.** Plain English, messages ≤ 140 characters, no wordplay that depends on adult vocabulary; visual clues over riddles; no maths-heavy puzzles; big tap targets.

## CI/CD, GitHub Pages and PWA

Two workflows: CI on every PR and push, deploy on `main`. The repo is private; the developer enables Pages with source "GitHub Actions" in repo settings. Levels arrive through PRs like code, so CI validates them before merge.

**`ci.yml`** (pull\_request, push): checkout → `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm` → `npm ci` → `npm run lint` (`oxlint --type-aware --type-check`) → `npm test` (Vitest, includes validating every level) → `npm run build`.

**`deploy.yml`** (push to `main`, workflow\_dispatch): the same install and build, then `actions/configure-pages`, `actions/upload-pages-artifact` with `dist/`, `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`; `concurrency: pages` so deploys don't overlap.

**PWA** (hand-written, no plugin):

- `manifest.webmanifest`: name "Black Dog Lane", short name, `display: standalone`, `orientation: any`, dark `theme_color` and `background_color`, 192/512 and maskable icons with the black dog silhouette; `start_url` and `scope` `/black-dog-lane/`.
- `sw.ts`: precache the app shell and all levels with a cache named by build hash; cache-first for assets, network-first for `index.html`; delete old caches on activate. Show an "Update available" toast instead of reloading mid-puzzle.
- Phone details: `viewport-fit=cover`, safe-area insets, `apple-mobile-web-app-capable` and a 180 px `apple-touch-icon` for iOS home-screen installs, `touch-action: manipulation`, no text selection on the scene.
- Saves survive updates because they're keyed by level id and save schema version.

## Milestones

Work in this order; each milestone ends green in CI and deployed, and the developer playtests only at the marked points.

1. **Scaffold and deploy.** Vite 8 + React 19 + TS 7, Oxlint type-aware, Vitest, CSS layers, hand-written PWA, both workflows, `CLAUDE.md`, `.claude/settings.json`. Done when: a placeholder page installs to a phone home screen from the Pages URL and opens offline.
2. **Engine + schema.** Types, Valibot schema, reducer, conditions, effects, hints, saves, level decoding. Done when: unit tests cover every effect and condition, and a save round-trips.
3. ~~**The dog.**~~ Built, then removed in 4.1 (see The logo).
4. **Port the prototype as `levels/test/waiting-room.json`.** Done when: it plays like `docs/reference/prototype.html` on a phone. Developer + child playtest (this level isn't secret).
   - **4.1 Remove the dog.** The playtest showed the animated helper dog broke the creepy tone. The dog leaves the engine, levels, art and audio; the Waiting Room goes back to the prototype's puzzles; the original silhouette stays as the logo.
5. **Solver + validator.** All checks in the table, spoiler-free CLI, Vitest suite over `levels/`. Done when: the ported level passes and deliberately broken fixtures trigger each error code.
6. **Three chapters and multi-room.** Doors between rooms, chapter intros and payoffs, carried-over inventory, level picker. Done when: a three-chapter test fixture validates and plays.
7. **Asset library growth.** The furniture, props, close-up templates and palettes listed above, with a preview page at `/dev/assets` in dev builds only.
   - Done with these choices: palettes reach assets through the render context (`ctx.pal`) rather than CSS custom properties, so the same strings work in tests and icons; the dog-related props (bone, collar, lead, food bowl, paw-print trail) were left out; all six puzzle widgets are playable.
8. **Generator.** `scripts/generate.ts` with caching, JSON-schema output, repair loop, encoding, branch + PR, and a cost report. Done when: three themes generate, validate, merge and deploy without a human reading them.
9. **First real level.** Generate one from a theme the two of them pick. Blind playtest. Feedback goes into the design rules and validator checks, never into the level by hand.

## Open questions

- [ ] Which phone and browser (iOS Safari or Android Chrome)? It decides which install and audio quirks to test first.
- [ ] Budget ceiling per generated level, once the first cost reports are in.
