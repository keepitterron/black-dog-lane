// Cross-reference checks the schema can't express: every id a level mentions must exist,
// ids must be unique, and puzzle data must be internally consistent. Reports ids only.
import { lookup } from './lookup.ts'
import type { Chapter, Cond, Effect, Level, Puzzle } from './schema.ts'

export type RefCode =
  | 'DUPLICATE_ID'
  | 'UNKNOWN_ITEM'
  | 'UNKNOWN_VIEW'
  | 'UNKNOWN_ROOM'
  | 'UNKNOWN_BEAT'
  | 'UNKNOWN_PUZZLE'
  | 'UNKNOWN_FIRED'
  | 'UNKNOWN_LAYER'
  | 'PUZZLE_SHAPE'

export type RefIssue = { code: RefCode; ids: string[] }

export function checkRefs(level: Level): RefIssue[] {
  const issues: RefIssue[] = []
  const report = (code: RefCode, ...ids: string[]) => issues.push({ code, ids })
  const idx = lookup(level)
  const items = new Set(Object.keys(level.items))

  // One namespace for everything an action, effect or condition can name.
  const seen = new Set<string>()
  const claim = (id: string) => {
    if (seen.has(id)) report('DUPLICATE_ID', id)
    seen.add(id)
  }
  for (const id of items) claim(id)
  for (const secret of level.secrets) claim(secret.id)
  for (const ending of level.endings) claim(ending.id)
  for (const chapter of level.chapters) {
    claim(chapter.id)
    for (const room of chapter.rooms) {
      claim(room.id)
      for (const [id, view] of [...Object.values(room.walls).map(wall => ['', wall] as const), ...Object.entries(room.closeUps)]) {
        if (id) claim(id)
        for (const hotspot of view.hotspots) claim(hotspot.id)
        for (const layer of view.layers) if (layer.id) claim(layer.id)
      }
    }
    for (const list of [chapter.puzzles, chapter.beats, chapter.objectives]) for (const { id } of list) claim(id)
  }

  const item = (id: string) => items.has(id) || report('UNKNOWN_ITEM', id)
  const view = (id: string) => idx.views.has(id) || report('UNKNOWN_VIEW', id)

  for (const combo of level.combos) for (const id of [combo.a, combo.b, combo.make]) item(id)
  for (const secret of level.secrets) {
    cond(secret.foundWhen, null)
    const entry = idx.views.get(secret.tell.view)
    if (!entry) report('UNKNOWN_VIEW', secret.tell.view)
    else if (!entry.view.layers.some(layer => layer.id === secret.tell.layer)) report('UNKNOWN_LAYER', secret.id, secret.tell.layer)
  }
  for (const ending of level.endings) cond(ending.when, null)

  for (const chapter of level.chapters) {
    const fireable = new Set(chapter.beats.map(x => x.id))
    if (idx.rooms.get(chapter.start.room)?.chapter !== chapter) report('UNKNOWN_ROOM', chapter.start.room)
    cond(chapter.exitWhen, chapter, fireable)
    for (const room of chapter.rooms) {
      for (const v of [...Object.values(room.walls), ...Object.values(room.closeUps)]) {
        for (const layer of v.layers) cond(layer.visibleWhen, chapter, fireable)
        if (v.puzzle && idx.puzzles.get(v.puzzle)?.chapter !== chapter) report('UNKNOWN_PUZZLE', v.puzzle)
        for (const hotspot of v.hotspots) {
          cond(hotspot.visibleWhen, chapter, fireable)
          for (const id of hotspot.accepts ?? []) item(id)
          for (const rule of hotspot.rules) {
            cond(rule.when, chapter, fireable)
            effects(rule.do, chapter, room.id)
          }
        }
      }
    }
    for (const room of chapter.rooms) for (const sound of room.ambient ?? []) cond(sound.when, chapter, fireable)
    for (const puzzle of chapter.puzzles) {
      puzzle.clues.forEach(view)
      cond(puzzle.activeWhen, chapter, fireable)
      effects(puzzle.onSolve, chapter, null)
      if (!puzzleShapeOk(puzzle)) report('PUZZLE_SHAPE', puzzle.id)
      if (puzzle.kind === 'trail') puzzle.trail.forEach(view)
    }
    for (const beat of chapter.beats) {
      if (beat.on.type !== 'afterFlag') view(beat.on.view)
      cond(beat.on.when, chapter, fireable)
      effects(beat.do, chapter, null)
    }
    for (const objective of chapter.objectives) {
      cond(objective.availableWhen, chapter, fireable)
      cond(objective.doneWhen, chapter, fireable)
    }
  }
  return issues

  function cond(c: Cond | undefined, chapter: Chapter | null, fireable?: Set<string>): void {
    if (!c) return
    switch (c.op) {
      case 'has':
      case 'selected':
        item(c.item)
        return
      case 'seen':
        view(c.view)
        return
      case 'fired': {
        const known = chapter ? fireable?.has(c.id) : level.chapters.some(ch => ch.beats.some(x => x.id === c.id))
        if (!known) report('UNKNOWN_FIRED', c.id)
        return
      }
      case 'not':
        cond(c.cond, chapter, fireable)
        return
      case 'all':
      case 'any':
        for (const sub of c.conds) cond(sub, chapter, fireable)
        return
      case 'flag':
        return
    }
  }

  // `room` is the room a hotspot lives in (close-ups must be in it), or null when the effect
  // can run from anywhere in the chapter.
  function effects(list: readonly Effect[], chapter: Chapter, room: string | null): void {
    for (const effect of list) {
      switch (effect.do) {
        case 'give':
        case 'take':
          item(effect.item)
          break
        case 'open': {
          const entry = idx.views.get(effect.view)
          if (entry?.wall !== null || entry.chapter !== chapter || (room && entry.room.id !== room)) report('UNKNOWN_VIEW', effect.view)
          break
        }
        case 'goto':
          if (idx.rooms.get(effect.room)?.chapter !== chapter) report('UNKNOWN_ROOM', effect.room)
          break
        case 'beat':
          if (idx.beats.get(effect.id)?.chapter !== chapter) report('UNKNOWN_BEAT', effect.id)
          break
        default:
          break
      }
    }
  }
}

function puzzleShapeOk(puzzle: Puzzle): boolean {
  switch (puzzle.kind) {
    case 'dialLock': {
      const symbols = new Set(puzzle.symbols)
      return (
        puzzle.initial.length === puzzle.solution.length &&
        [...puzzle.initial, ...puzzle.solution].every(s => symbols.has(s))
      )
    }
    case 'clockSet':
      return puzzle.solution.m % puzzle.minuteStep === puzzle.initial.m % puzzle.minuteStep
    case 'sequence':
      return puzzle.solution.every(t => puzzle.targets.includes(t))
    case 'slider': {
      const n = puzzle.size * puzzle.size
      const isPermutation = (tiles: number[]) => tiles.length === n && new Set(tiles).size === n && tiles.every(t => t < n)
      return isPermutation(puzzle.initial) && isPermutation(puzzle.solution)
    }
    case 'pattern': {
      const n = puzzle.rows * puzzle.cols
      return puzzle.initial.length === n && puzzle.solution.length === n
    }
    case 'trail':
      return true
  }
}
