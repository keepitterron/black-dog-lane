---
name: new-level
description: Write a new real level from a one-line theme, rework one, or fix one by id, in a separate subagent, keeping its content secret. Returns only the spoiler-free validator report and the PR link.
argument-hint: "<theme>  |  rework <level-id> [notes by ids]  |  fix <level-id> <problem described by ids>"
context: fork
agent: general-purpose
background: false
disable-model-invocation: true
---

# Write a Black Dog Lane level

Request: $ARGUMENTS

You are writing a real level for Black Dog Lane, a creepy point-and-click puzzle game that a parent and a 9-year-old play together on a phone. The parent is also the developer, and **plays every real level blind**. You work in your own subagent so that nothing you write reaches them before they play it. Only your final message goes back.

The bar is **genuine novelty**. Players loved the creepy, mysterious mood and the variety that kept them trying. They got bored when a level felt like the test rooms rearranged: the same furniture, the same widgets dressed the same way, and objects that meant something elsewhere sitting dead. Every level should bring things they have never seen: its own look, its own objects, its own mysteries and a puzzle idea of its own. This costs more work per level. Take it.

## The secret rules (non-negotiable)

- **Your final message contains only:** the report lines printed by `npm run level -- pack` (or `check`), then the PR link printed by `npm run level -- pr`. If you have to stop early, write one line starting `BLOCKED:` that gives the reason in neutral, story-free terms, for example `BLOCKED: needs a widget where pieces rotate` or `BLOCKED: LENGTH c2 still 9 steps after 6 rounds`.
- Never mention the story, setting details, item names, text, art, puzzle answers or hints in the final message, a commit message, a branch name or a PR. `npm run level` writes the commit, branch and PR for you.
- **Use opaque ids everywhere.** Validator reports print ids, so ids must not give anything away:
  - chapters `c1`–`c3`;
  - rooms `c1r1`;
  - close-up views `v01`…;
  - hotspots `h01`…;
  - layers `l01`…;
  - own art `a01`…;
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
   - **Puzzle design rules**;
   - **Level format**;
   - **Validator and solver**: what each error code means.
3. `src/engine/schema.ts`: the exact level format, including `art` and custom palettes (strict: unknown keys fail).
4. `npm run level -- catalog`: catalog assets, widgets, palettes, icons, symbols, sounds, and the own-art shape vocabulary at the end.
5. `npm run level -- usage`: which catalog assets, widgets and palettes earlier levels already used. Lean away from what is common there.
6. `levels/test/two-rooms.json`: a dull but valid three-chapter level showing how doors, keys carried between chapters, beats, objectives, secrets and own art fit together. Copy its structure, never its dullness.

## What the validator holds you to (keeps it playable)

These are checked; everything else is your call.

- Three chapters, each with `start`, `intro` and `exitWhen`; chapters 1 and 2 also have an `outro`. Every door has a way back.
- Solvable, no dead ends, every room reachable.
- 12–25 meaningful steps per chapter, usually 2–3 objectives open at once, a beat (sound plus a line) at least every ~3 steps.
- Every puzzle takes clues from at least two views. Anything tagged `looksLikeClue` is one.
- Every tap does something on some path (`ORPHAN_HOTSPOT`) and **every visible hotspot always answers** (`SILENT_TAP`): once an object is spent, give it a last line, change its art, or hide it.
- **No dead catalog pieces** (`DEAD_PROP`): a catalog prop, or a catalog piece that changes with a flag, must sit under a hotspot whenever it shows. Elsewhere those are puzzle pieces; drawn dead they read as a broken puzzle.
- **Decor is obviously decor** (`DECOR_TAP`): mark set dressing `decor: true` in its own art. It is drawn quieter and must never sit under a hotspot.
- **Every room shows art the level brought** (`NOVELTY`).
- At least one secret with a visible tell, acknowledged by an ending. Three hint tiers per objective.
- Messages ≤140 characters, in plain English a 9-year-old reads easily. Unsettling and implied, never gory.

## Making it new (your job, not a checklist)

- **Start from an idea, not the template.** Before writing anything, find what makes this theme strange: a rule the house follows, something that changes when you look away, a character whose intentions aren't clear, a place that isn't a room at all. Build the chapters around it. Settings don't have to be wallpapered rooms: an own `shell` can be a garden at dusk, a stairwell, the inside of something.
- **Draw the level's own world.** Give every room its own pieces in `level.art`, plus your own palette (`{ "base": …, "colours": { … } }`) if no catalog palette fits. Keep art cheap through artistic choices, not by reusing the catalog: bold silhouettes, a few flat shapes, two or three tones from the palette, one accent colour for what matters, a little motion (`anim`) where it unsettles. Aim for roughly 5–40 shapes per piece. Use flags (`if`/`unless`) so pieces change as the story moves.
- **Use the catalog sparingly.** Use it where a piece genuinely fits the scene, never as the main look. Avoid the pieces `usage` shows most.
- **Make the objects the level's own.** Own props work as item icons, sequence targets and container props. Items should feel specific to this story, not the generic keys and matches of the test rooms.
- **Give each puzzle something new.** The widgets are a fixed library (dial lock, clock, sequence, slider, pattern, trail), but what they mean, where their clues hide and how they're dressed is yours. Mix kinds across the level and avoid the kinds `usage` shows most. Make the level's central puzzle idea something these players haven't seen. Build clues out of the art itself: a shape that only shows once something else changes, a reflection, a shadow, an order shown by objects.
- **Change things as they play.** At least one moment per chapter should transform what is already on screen, so old objects mean something new.
- **Tell objects apart.** Everything that looks usable is usable, and stays responsive after its job is done. Everything that isn't usable is decor, drawn as decor.
- **Hide secrets.** Have at least one. Each has a visible tell (a layer that looks slightly off), and an ending acknowledges it.

## How the validator sees a level (read before designing)

- **Close-ups count as reachable from the start, however they're opened.** A lock on the hotspot that opens a close-up gates nothing for the solver. Gate the close-up's puzzle with `activeWhen`, and its pickups and taps with `visibleWhen` on the opener's flag. Otherwise the solver takes shortcuts a player can't, and step counts come out short.
- **What counts as a step:**
  - the first look at each clue view;
  - each puzzle solve;
  - each combine;
  - each tap that changes state.
- **Objectives.** Prefer flags in `availableWhen`. A `has` on an item turns false once the item is used, which can leave no open objective (`HINT_GAP`).
- **`looksLikeClue`** goes only on hotspots inside a view that some puzzle lists in `clues`. On a wall hotspot that merely opens a clue close-up it's a `FALSE_CLUE`.
- **`exitWhen`** must match the condition under which the exit hotspot's `endChapter` rule fires.
- **A hotspot whose rules all have a `when`** (an item, a flag) is silent while none holds: end its rules with an unconditioned `say`.
- **Codes.** The meanings are in `docs/handoff.md` → Validator and solver, and in the comments around `CHECK_CODES` in `src/solver/validate.ts` (which also has `BEAT_LOST`, `ASSET_REF` and the ref codes). `DRAFT_ON` means an `on:` names no placeable layer in that view. `SCHEMA` on `schema` means the draft isn't on the current schema version (see `catalog`).

## Authoring tips

- **Placement params.** `slot`, `atX`, `atY` and `scale` go inside a layer's `params`, for catalog and own art alike.
- **Hotspots.** On walls, give the layer an `id` and the hotspot `on: "<layer id>"` instead of a `rect`; `npm run level` fills in the rect. On close-ups, write `rect: [x, y, w, h]` in the 800×600 scene, with targets well apart.
- **Floor props.** A prop in the `floor` slot sits low, and its padded hotspot can pass the scene's bottom edge. Place small floor props with `atY` around 500 instead.
- **Close-up positions.** For where catalog close-up templates draw things (the `prop1`–`prop3` of `containerClose`, the key in `coatClose`), read the drawing in `src/art/assets/templates.ts` or `closeUps.ts`. Your own close-ups are drawn in the full 800×600 scene, so you know where everything is.
- **No starting flags.** Every flag starts unset, so design art states that switch on, not off.
- **Builder script.** Writing a whole level as raw JSON is long. You may write a small builder script in `.gen/` (helpers like `scripts/levels/strict.ts`) that prints the draft. Keep it in `.gen/` and delete it with the draft.

## Workflow

### New level (`$ARGUMENTS` is a theme)
1. Run `npm run level -- usage`. Plan the three chapters for yourself: the central idea, arc, rooms and their look, threads, puzzles, items, beats, transforming moments, secrets, ending. Keep the plan in your head or in `.gen/`, never in the final message.
2. Write the full level JSON, with `schema` set to the version `catalog` gives, to `.gen/<id>.json`.
3. Run `npm run level -- check .gen/<id>.json`. Fix every code it prints and run it again until it prints `OK`. If the same code keeps failing after about 6 rounds, stop with `BLOCKED:`.
4. Run `npm run level -- pack .gen/<id>.json`. It encodes to `levels/play/<id>.level` and deletes the draft. Then delete anything else you left in `.gen/`.
5. Run `npm run level -- pr <id>`. It needs a clean working tree. If it refuses, stop with `BLOCKED: working tree not clean` and leave the packed file where it is.
6. Final message: the pack report lines, then the PR link.

### Rework (`$ARGUMENTS` starts with `rework <level-id>`)
Brings an existing level up to the current rules and bar. Its players have usually played it already.
1. Run `npm run level -- unpack <level-id>` to get `.gen/<level-id>.json`, and `npm run level -- usage`.
2. Keep the story, characters, chapter arc and ending. Everything else is open: give it its own look (own art in every room, its own palette if it helps), replace catalog pieces that don't belong, turn dead or spent objects into live ones or decor, and rethink puzzles that repeat other levels. Follow any notes the developer gave (by ids).
3. Set `schema` to the current version. Run `check` until it prints `OK`, then `npm run level -- pack .gen/<level-id>.json --replace`, then `npm run level -- pr <level-id>`. The PR goes up as an update.
4. Final message: the report lines and the PR link. Don't describe the changes.

### Fix (`$ARGUMENTS` starts with `fix <level-id>`)
The developer describes the problem in ids only (chapter, room, hotspot, puzzle, or a validator code).
1. Run `npm run level -- unpack <level-id>` to get `.gen/<level-id>.json`.
2. Make the smallest change that fixes it, and keep the level's story and puzzles otherwise as they are. If the level is on an older schema, `check` will ask for the current one: bump it and fix what the newer rules then report, as lightly as possible (or stop with `BLOCKED: needs rework` if that would mean redrawing the level).
3. Run `check` until it prints `OK`, then `npm run level -- pack .gen/<level-id>.json --replace`, then `npm run level -- pr <level-id>`. The PR goes up as an update.
4. Final message: the report lines and the PR link. Don't describe the change beyond ids.

## When the baseline isn't enough

Art is never a reason to stop: draw what you need in `level.art`. If the idea really needs something the engine can't do (a new kind of widget, condition, effect or sound), stop with `BLOCKED: needs …`, phrased generically, so the developer can decide whether to build it.
