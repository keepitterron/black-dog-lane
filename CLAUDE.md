# Black Dog Lane

A data-driven, Rusty Lake-style point-and-click puzzle game (Vite + React PWA on GitHub Pages) for a parent and a 9-year-old playing together on a phone. The black dog is the logo (title screen and app icons). The `/new-level` skill turns a one-line theme into a validated, encoded three-chapter level with its own art and opens a PR.

Full spec: [docs/handoff.md](docs/handoff.md). Behavioural reference for the engine: [docs/reference/prototype.html](docs/reference/prototype.html) (the test room, not secret).

## Surprise protocol (always applies)

The developer plays every real level blind.

- Never print level content (JSON, story text, item names, hints, solutions) into chat, commits, PR descriptions, CI logs or test names. Refer to puzzles and objects by opaque id only (`p07`, `obj12`).
- Never read `levels/play/**` unless explicitly told to. Develop and debug against `levels/test/` fixtures. `.claude/settings.json` denies reads there.
- Real levels are `levels/play/*.level`: gzip + base64 JSON, written only by `scripts/level.ts` (driven by the `/new-level` skill), read only by scripts, the validator and the build.
- Level drafts live in the git-ignored `.gen/`. Never read `.gen/**` in the main session either; only the `/new-level` subagent works there. (It can't be a deny rule: deny rules also bind the skill's subagent.)
- Validator and generator output only counts, ids, pass/fail and error codes.
- Level PRs contain only the encoded file. Title `Add level: <title>`, body = the validator report.
- Runtime errors and fixes are described by level/chapter/room/puzzle id, never in content terms.

## Stack

Node 24 (`.nvmrc`), npm, Vite 8 (Rolldown + Oxc), React 19, TypeScript 7 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), Oxlint type-aware (`oxlint --type-aware --type-check`, no separate `tsc`), Vitest 5 (node env), Valibot, plain CSS Modules with cascade layers. Hand-written PWA (no Workbox). Claude API via plain `fetch`. Scripts in `scripts/*.ts` run with Node's built-in type stripping.

Dependencies are limited to: `react`, `react-dom`, `valibot`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `oxlint`, `oxlint-tsgolint`, `vitest`. Anything new needs a one-line justification in its PR. Pin exact versions.

## Architecture rules

- `src/engine` and `src/solver` import nothing from React or the DOM; they run in the browser, tests and the validator.
- The engine is a pure reducer: `step(level, state, action) → { state, events }`. No level-specific code anywhere; levels are pure data validated by the Valibot schema (types are inferred from it).
- Every level has exactly three chapters. Conditions and effects are closed sets; no `eval`.
- Art is a parametric SVG asset library in `src/art`, plus each level's own drawings as shape data (`level.art`, drawn by `src/art/levelArt.ts`); audio is synthesized with Web Audio in `src/audio`. No raster images and no raw SVG in level data.

## Commands

- `npm run dev`: dev server (no service worker in dev).
- `npm run lint`: Oxlint with type checking; this is the only type check.
- `npm test`: Vitest.
- `npm run build` then `npm run preview`: production build at `/black-dog-lane/`, with the service worker.
- `npm run fixtures`: rebuild test levels authored in TypeScript (`scripts/levels/*.ts` → `levels/test/*.json`); a test fails if they drift.
- `node scripts/icons.ts`: regenerate `public/icons` from `src/art/dogMark.ts` (needs `rsvg-convert`).
- `npm run validate -- [--fixture] <file…>`: spoiler-free validator report for `.json` or `.level` files; exits 1 on failure. The default `play` profile is strict and binds every real level; `--fixture` skips the authoring and pacing checks for hand-built test levels.
- `npm run level -- catalog | usage | check <draft> | pack <draft> [--replace] | unpack <id> | pr <id>`: the level authoring tools behind `/new-level` (see below). `usage` reads real levels (catalog ids and counts only); leave it to the skill.

The service worker lives in `src/sw/` with its own `tsconfig.json` (WebWorker lib, which clashes with DOM). Files in `public/` must be listed in `PUBLIC_FILES` in `vite.config.ts` to be precached.

`levels/test/waiting-room.json` is the prototype ported to level data (three chapters in one room), built by `scripts/levels/waiting-room.ts`. Edit the builder, never the JSON. `src/solver/solve.ts` explores the abstract state graph; `src/solver/validate.ts` runs every check over it (error codes in `CHECK_CODES`). `levels/test/strict.json` (`scripts/levels/strict.ts`) is a dull level that passes the strict profile, and `levels/test/broken/<CODE>.json` (`scripts/levels/broken.ts`) breaks exactly one rule each. `levels/test/two-rooms.json` (`scripts/levels/two-rooms.ts`) is the multi-room fixture: two rooms per chapter joined by doors, keys carried between chapters, chapter outros; it also passes the strict profile.

The solver ignores where the player stands but only acts in rooms a door currently leads to from the chapter start (`reachableRooms`). That relies on `ONE_WAY_DOOR`: every door needs a way back through always-open doors. If Vitest's `import.meta.glob` misses newly written fixtures, delete `node_modules/.vitest-cache`.

The title screen lists levels from `src/ui/levels.ts`: real levels first (decoded at runtime), then the Waiting Room and Two Rooms; `basic` and `strict` are listed in dev builds only. Each level keeps its own save.

The asset catalog is split in two. `src/catalog/assets.ts` is pure metadata (kind, a one-line description, typed params, flags, bbox, anchor and allowed slots) that the validator and the generator read; `src/art/assets` holds one drawing per id (`(params, { flags, pal }) → SVG`), and `ASSETS` must cover every catalog id. Params ending in `Flag` name a flag the asset reacts to. Wall pieces and props can be placed with `slot` (`left | centre | right | floor | ceiling`) or `atX`/`atY`, plus `scale`; without them they draw where they were drawn. `placedRect()` gives the placed bbox. Props are drawn around the origin and double as inventory icons. Room colours come from `ctx.pal` (`src/art/palettes.ts`, one palette per `level.palette`, which may also be a catalog base with the level's own colours); colours that carry meaning (brass, flame, paper, ink) stay fixed.

A level's own art (`level.art`, ids `a01`…) is a closed shape vocabulary in the schema: shells, wall pieces, props and close-ups that place, nest (`use`) and react to flags like catalog assets, and own props work as icons, sequence targets and container props. `decor: true` pieces are drawn quieter. Level schema 2 added it with four play-profile rules: `SILENT_TAP` (a visible hotspot with no applicable rule), `DEAD_PROP` (a catalog prop or flag-driven piece with no hotspot over it), `DECOR_TAP` (decor under a hotspot) and `NOVELTY` (a room with none of the level's own art). Levels still on schema 1 skip those four; `level check` requires drafts on the current version. The validator's `ASSET_REF` rejects unknown assets, palettes and icons, bad params or slots, and close-up art on walls. `/dev/assets` (dev builds only) previews every asset in any palette and plays every puzzle widget. Widgets live in `src/ui/game/PuzzleWidget.tsx`; trail marks are `trailMark` layers that Scene makes tappable, and a trail tap counts on the view it names. `tests/assets.test.ts` pins the Waiting Room's rendered art by hash.

Real levels are written by the `/new-level` skill (`.claude/skills/new-level/SKILL.md`), which runs in a forked subagent so the content never reaches the main conversation; it returns only the report lines and the PR link. `/new-level <theme>` writes a new level; `/new-level rework <id> [notes by ids]` brings one up to the current schema and novelty bar, keeping its story; `/new-level fix <id> <problem by ids>` unpacks, fixes and re-packs one. Drafts are plain level JSON in `.gen/`, except that a wall hotspot may give `on: "<layerId>"` instead of a `rect` (resolved to the layer's `placedRect`). `npm run level -- pr` commits only the level file on `level/<id>` (or `level/<id>-<timestamp>` for an update), opens the PR with the validator report and switches back. Ids in real levels are opaque (`c1r1`, `h07`, `p03`) because reports print them. Never invoke `/new-level` on the developer's behalf: they run it.

Engine tests build levels with `tests/fixture.ts` (`baseLevel()` plus only what a test needs). `levels/test/basic.json` is a dull three-chapter fixture played end to end by `tests/walkthrough.test.ts`. Oxlint blocks React, UI imports and DOM globals inside `src/engine` and `src/solver`.

`@types/node` is a dev dependency beyond the spec's list: `scripts/*.ts` and `vite.config.ts` need Node types to type-check.

## Workflow

Work milestone by milestone (see `docs/handoff.md` → Milestones). Each milestone ends green in CI and deployed.
