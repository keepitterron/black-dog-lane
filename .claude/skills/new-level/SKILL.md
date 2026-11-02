---
name: new-level
description: Write a new real level from a one-line theme (or fix a real level by id) in a separate subagent, keeping its content secret. Returns only the spoiler-free validator report and the PR link.
argument-hint: "<theme>  |  fix <level-id> <problem described by ids>"
context: fork
agent: general-purpose
background: false
disable-model-invocation: true
---

# Write a Black Dog Lane level

Request: $ARGUMENTS

You are writing a real level for Black Dog Lane, a creepy point-and-click puzzle game that a parent and a 9-year-old play together on a phone. The parent is also the developer, and **plays every real level blind**. You work in your own subagent so that nothing you write reaches the developer before they play it. Only your final message goes back to them.

## The secret rules (non-negotiable)

- **Your final message contains only:** the report lines printed by `npm run level -- pack` (or `check`), then the PR link printed by `npm run level -- pr`. If you have to stop early, write one line starting `BLOCKED:` that gives the reason in neutral, story-free terms, for example `BLOCKED: needs a light-source asset that can be carried` or `BLOCKED: LENGTH c2 still 9 steps after 6 rounds`.
- Never mention the story, setting details, item names, text, puzzle answers or hints in the final message, a commit message, a branch name or a PR. `npm run level` writes the commit, branch and PR for you.
- **Use opaque ids everywhere.** Validator reports print ids, so ids must not give anything away:
  - chapters `c1`–`c3`;
  - rooms `c1r1`;
  - hotspots `h01`…;
  - layers `l01`…;
  - puzzles `p01`…;
  - items `i01`…;
  - flags `f01`…;
  - beats `b01`…;
  - objectives `o01`…;
  - secrets `s01`…;
  - endings `e01`….
  
  The level `id` is the one exception: a short kebab-case slug of the title (the title shows in the level picker and the PR title anyway).
- Never read `levels/play/**` with your tools; the project denies it. Real levels go through `npm run level` only.
- Drafts live only in `.gen/`, which is git-ignored. Never commit a draft or copy level content anywhere else.

## Read first

1. `CLAUDE.md`: the architecture and the surprise protocol.
2. `docs/handoff.md`, these sections:
   - **Puzzle design rules**: every rule binds;
   - **Level format**;
   - **Validator and solver**: what each error code means.
3. `src/engine/schema.ts`: the exact level format (strict: unknown keys fail).
4. `npm run level -- catalog`: every asset with its params, flags and slots, plus the puzzle widgets, palettes, icons, symbols and sounds. Use nothing outside it.
5. `levels/test/two-rooms.json`: a dull but valid three-chapter level showing how doors, keys carried between chapters, beats, objectives and secrets fit together. Copy its structure, not its dullness.

## The pattern (baseline every level follows)

- **Three chapters.** Each has 1–3 rooms joined by `doorway` hotspots that `goto` each other and are always open, plus `start`, `intro` and `exitWhen`. Chapters 1 and 2 also need an `outro`. Inventory and flags carry over: at least one item found in each of chapters 1 and 2 is needed in the next chapter.
- **Pacing:**
  - 12–25 meaningful steps per chapter;
  - 2–3 objectives open at once for most of each chapter, with threads that need each other;
  - at least one beat (a `sound` sting plus a `say` line) per ~3 steps, right after progress and in view.
- **Puzzles.** Use 2–4 widget puzzles per chapter, mixing kinds across the level. Each puzzle needs clues from at least two views (`clues`). A widget lives on a close-up whose `puzzle` names it; a trail lives on `trailMark` layers on walls.
- **One transforming moment per chapter:** lighting, a mirror, a time shift. A flag flips art across the room, and old objects mean something new.
- **Taps and clues.** Everything tappable pays off. Anything that looks like a clue (a number, a symbol, a stopped clock, a marked object) is one, and its hotspot sets `looksLikeClue`. Pure atmosphere is a layer with no hotspot.
- **Secrets.** Have at least one. Each has a visible tell (a layer that looks slightly off), and an ending acknowledges it.
- **Hints.** Each objective has three tiers: a nudge, a pointer to the object, then the answer.
- **Words:**
  - plain English a 9-year-old reads easily;
  - every message ≤140 characters;
  - unsettling and implied, never gory;
  - no dog anywhere in the level (the dog is only the game's logo).
- **Look.** Pick a palette that fits the theme. Each wall starts with `roomShell` (choose its `pattern`). Then place furniture by `slot` (at most one piece per slot per wall), and props by `slot` or on a surface with `atX`/`atY`.
- **Hotspots.** On walls, give the layer an `id` and the hotspot `on: "<layer id>"` instead of a `rect`; `npm run level` fills in the rect. On close-ups, write `rect: [x, y, w, h]` in the 800×600 scene, with targets well apart.

## How the validator sees a level (read before designing)

- **Close-ups count as reachable from the start, however they're opened.** A lock on the hotspot that opens a close-up gates nothing for the solver. Gate the close-up's puzzle with `activeWhen`, and its pickups and taps with `visibleWhen` on the opener's flag. Otherwise the solver takes shortcuts a player can't, and step counts come out short.
- **What counts as a step:**
  - the first look at each clue view;
  - each puzzle solve;
  - each combine;
  - each tap that changes state.
  
  Plan the 12–25 per chapter with that in mind.
- **Objectives.** Prefer flags in `availableWhen`. A `has` on an item turns false once the item is used, which can leave no open objective (`HINT_GAP`).
- **`looksLikeClue`** goes only on hotspots inside a view that some puzzle lists in `clues`. On a wall hotspot that merely opens a clue close-up it's a `FALSE_CLUE`.
- **`exitWhen`** must match the condition under which the exit hotspot's `endChapter` rule fires.
- **Codes.** The meanings are in `docs/handoff.md` → Validator and solver, and in the comments around `CHECK_CODES` in `src/solver/validate.ts` (which also has `BEAT_LOST`, `ASSET_REF` and the ref codes). `DRAFT_ON` means an `on:` names no placeable layer in that view.

## Authoring tips

- **Placement params.** `slot`, `atX`, `atY` and `scale` go inside a layer's `params`.
- **Floor props.** A prop in the `floor` slot sits low, and its padded hotspot can pass the scene's bottom edge. Place small floor props with `atY` around 500 instead.
- **Close-up positions.** For where close-up templates draw things (the `prop1`–`prop3` of `containerClose`, the key in `coatClose`), read the drawing in `src/art/assets/templates.ts` or `closeUps.ts` and put rects on those spots.
- **Close-up view ids** are opaque too: `v01`…
- **No starting flags.** Every flag starts unset, so design art states that switch on, not off.
- **Builder script.** Writing a whole level as raw JSON is long. You may write a small builder script in `.gen/` (helpers like `scripts/levels/strict.ts`) that prints the draft. Keep it in `.gen/` and delete it with the draft.

## Workflow

### New level (`$ARGUMENTS` is a theme)
1. Plan the three chapters for yourself: arc, rooms, threads, puzzles, items, beats, transforming moments, secrets, ending. Keep the plan in your head or in `.gen/`, never in the final message.
2. Write the full level JSON to `.gen/<id>.json`.
3. Run `npm run level -- check .gen/<id>.json`. Fix every code it prints and run it again until it prints `OK`. Codes come with chapter and opaque ids; `docs/handoff.md` explains each one. If the same code keeps failing after about 6 rounds, stop with `BLOCKED:`.
4. Run `npm run level -- pack .gen/<id>.json`. It encodes to `levels/play/<id>.level` and deletes the draft. Then delete anything else you left in `.gen/`.
5. Run `npm run level -- pr <id>`. It needs a clean working tree. If it refuses, stop with `BLOCKED: working tree not clean` and leave the packed file where it is.
6. Final message: the pack report lines, then the PR link.

### Fix (`$ARGUMENTS` starts with `fix <level-id>`)
The developer describes the problem in ids only (chapter, room, hotspot, puzzle, or a validator code).
1. Run `npm run level -- unpack <level-id>` to get `.gen/<level-id>.json`.
2. Make the smallest change that fixes it, and keep the level's story and puzzles otherwise as they are.
3. Run `check` until it prints `OK`, then `npm run level -- pack .gen/<level-id>.json --replace`, then `npm run level -- pr <level-id>`. The PR goes up as an update.
4. Final message: the report lines and the PR link. Don't describe the change beyond ids.

## When the baseline isn't enough

If the theme really needs something the catalog doesn't have (an asset, a flag state, a widget, a sound), don't improvise with mismatched art. Stop with `BLOCKED: needs …`, phrased generically, so the developer can decide whether to build it.
