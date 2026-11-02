# Black Dog Lane

A data-driven, Rusty Lake-style point-and-click puzzle game (Vite + React PWA on GitHub Pages) for a parent and a 9-year-old playing together on a phone. The black dog is only the logo (title screen and app icons), not a character in levels. A local generator turns a one-line theme into a validated, encoded three-chapter level and opens a PR.

Full spec: [docs/handoff.md](docs/handoff.md). Behavioural reference for the engine: [docs/reference/prototype.html](docs/reference/prototype.html) (the test room, not secret).

## Surprise protocol (always applies)

The developer plays every real level blind.

- Never print level content (JSON, story text, item names, hints, solutions) into chat, commits, PR descriptions, CI logs or test names. Refer to puzzles and objects by opaque id only (`p07`, `obj12`).
- Never read `levels/play/**` unless explicitly told to. Develop and debug against `levels/test/` fixtures. `.claude/settings.json` denies reads there.
- Real levels are `levels/play/*.level`: gzip + base64 JSON, written only by `scripts/generate.ts`, read only by the validator and the build.
- Validator and generator output only counts, ids, pass/fail and error codes.
- Level PRs contain only the encoded file. Title `Add level: <title>`, body = the validator report.
- Runtime errors and fixes are described by level/chapter/room/puzzle id, never in content terms.

## Stack

Node 24 (`.nvmrc`), npm, Vite 8 (Rolldown + Oxc), React 19, TypeScript 7 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), Oxlint type-aware (`oxlint --type-aware --type-check`, no separate `tsc`), Vitest 4 (node env), Valibot, plain CSS Modules with cascade layers. Hand-written PWA (no Workbox). Claude API via plain `fetch`. Scripts in `scripts/*.ts` run with Node's built-in type stripping.

Dependencies are limited to: `react`, `react-dom`, `valibot`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `oxlint`, `oxlint-tsgolint`, `vitest`. Anything new needs a one-line justification in its PR. Pin exact versions.

## Architecture rules

- `src/engine` and `src/solver` import nothing from React or the DOM; they run in the browser, tests and the validator.
- The engine is a pure reducer: `step(level, state, action) → { state, events }`. No level-specific code anywhere; levels are pure data validated by the Valibot schema (types are inferred from it).
- Every level has exactly three chapters. Conditions and effects are closed sets; no `eval`.
- Art is a parametric SVG asset library in `src/art`; audio is synthesized with Web Audio in `src/audio`. No raster or generated images.
- No dog in levels: an animated helper dog was tried and removed in M4.1 because it broke the creepy tone. Don't reintroduce dog mechanics, poses or sounds unless asked.

## Commands

- `npm run dev`: dev server (no service worker in dev).
- `npm run lint`: Oxlint with type checking; this is the only type check.
- `npm test`: Vitest.
- `npm run build` then `npm run preview`: production build at `/black-dog-lane/`, with the service worker.
- `npm run fixtures`: rebuild test levels authored in TypeScript (`scripts/levels/*.ts` → `levels/test/*.json`); a test fails if they drift.
- `node scripts/icons.ts`: regenerate `public/icons` from `src/art/dogMark.ts` (needs `rsvg-convert`).
- Later: `npm run validate -- <file>`, `npm run gen -- "<theme>"`.

The service worker lives in `src/sw/` with its own `tsconfig.json` (WebWorker lib, which clashes with DOM). Files in `public/` must be listed in `PUBLIC_FILES` in `vite.config.ts` to be precached.

`levels/test/waiting-room.json` is the prototype ported to level data (three chapters in one room), built by `scripts/levels/waiting-room.ts`. Edit the builder, never the JSON. `src/solver/solve.ts` proves every test level can be finished with no dead ends.

Art is a catalog of parametric assets in `src/art/assets` (`(params, { flags }) → SVG`). Params ending in `Flag` name a flag the asset reacts to. Puzzle widgets with fixed close-up layouts live in `src/ui/game/PuzzleWidget.tsx`; only dial lock and clock exist so far.

Engine tests build levels with `tests/fixture.ts` (`baseLevel()` plus only what a test needs). `levels/test/basic.json` is a dull three-chapter fixture played end to end by `tests/walkthrough.test.ts`. Oxlint blocks React, UI imports and DOM globals inside `src/engine` and `src/solver`.

`@types/node` is a dev dependency beyond the spec's list: `scripts/*.ts` and `vite.config.ts` need Node types to type-check.

## Workflow

Work milestone by milestone (see `docs/handoff.md` → Milestones). Each milestone ends green in CI and deployed.
