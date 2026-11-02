import { describe, expect, test } from 'vitest'
import { addHotspot, baseLevel, play } from '../../tests/fixture.ts'
import { DOG, DOG_SLOT } from './dog.ts'
import { newGame } from './state.ts'
import { step } from './step.ts'
import { NO_COMBINE, NOTHING_HAPPENS } from './text.ts'

const fill = (text: string) => text.replaceAll('{dog}', DOG.name)

describe('navigation', () => {
  test('turning walks the four walls; left and right are inverses', () => {
    const level = baseLevel()
    const right = play(level, [{ type: 'turn', dir: 'right' }]).state
    expect(right.location.wall).toBe('e')
    expect(play(level, [{ type: 'turn', dir: 'left' }], right).state.location.wall).toBe('n')
    const four = play(level, Array.from({ length: 4 }, () => ({ type: 'turn', dir: 'left' }) as const)).state
    expect(four.location.wall).toBe('n')
  })

  test('close-ups stack, Back pops one, and turning is ignored inside one', () => {
    const level = baseLevel()
    const r = level.chapters[0].rooms[0]!
    r.closeUps['drawer'] = { layers: [], hotspots: [] }
    r.closeUps['photo'] = { layers: [], hotspots: [] }
    const opened = play(level, [{ type: 'open', view: 'drawer' }, { type: 'open', view: 'photo' }, { type: 'turn', dir: 'right' }]).state
    expect(opened.location).toMatchObject({ wall: 'n', closeUps: ['drawer', 'photo'] })
    const back = play(level, [{ type: 'back' }], opened).state
    expect(back.location.closeUps).toEqual(['drawer'])
    expect(play(level, [{ type: 'back' }, { type: 'back' }], back).state.location.closeUps).toEqual([])
  })

  test('opening a wall view or an unknown view is refused', () => {
    const { state, events } = play(baseLevel(), [{ type: 'open', view: 'c1r/e' }])
    expect(state.location.closeUps).toEqual([])
    expect(events).toEqual([{ type: 'error', code: 'UNKNOWN_VIEW', ids: ['c1r/e'] }])
  })

  test('arrive marks the current view as seen', () => {
    const { state } = play(baseLevel(), [{ type: 'arrive' }, { type: 'turn', dir: 'right' }, { type: 'arrive' }])
    expect(state.flags).toMatchObject({ 'seen:c1r/n': true, 'seen:c1r/e': true })
  })
})

describe('items', () => {
  const start = () => ({ ...newGame(baseLevel()), inventory: ['a', 'b', 'key'] })

  test('tap once selects and names it; tap again describes and deselects', () => {
    const level = baseLevel()
    const once = play(level, [{ type: 'tapItem', id: 'a' }], start())
    expect(once.state.selected).toBe('a')
    expect(once.said).toEqual(['Item A'])
    const twice = play(level, [{ type: 'tapItem', id: 'a' }], once.state)
    expect(twice.state.selected).toBeNull()
    expect(twice.said).toEqual(['Item A description.'])
  })

  test('selecting one item then tapping another combines them, in either order', () => {
    const level = baseLevel()
    for (const [x, y] of [['a', 'b'], ['b', 'a']] as const) {
      const { state, said } = play(level, [{ type: 'tapItem', id: x }, { type: 'tapItem', id: y }], start())
      expect(state.inventory).toEqual(['key', 'ab'])
      expect(state.selected).toBeNull()
      expect(said.at(-1)).toBe('Combined.')
    }
  })

  test('a pair with no combo says so and deselects', () => {
    const { state, said } = play(baseLevel(), [{ type: 'tapItem', id: 'a' }, { type: 'tapItem', id: 'key' }], start())
    expect(state.inventory).toEqual(['a', 'b', 'key'])
    expect(state.selected).toBeNull()
    expect(said.at(-1)).toBe(NO_COMBINE)
  })

  test('tapping an item you do not hold is an error by id', () => {
    expect(play(baseLevel(), [{ type: 'tapItem', id: 'ab' }]).events).toEqual([{ type: 'error', code: 'UNKNOWN_ITEM', ids: ['ab'] }])
  })
})

describe('hotspots', () => {
  function level() {
    const l = baseLevel()
    addHotspot(l, 'c1r/n', {
      id: 'door',
      accepts: ['key'],
      rules: [
        { when: { op: 'selected', item: 'key' }, do: [{ do: 'setFlag', flag: 'open', value: true }, { do: 'say', text: 'Unlocked.' }] },
        { when: { op: 'flag', flag: 'open' }, do: [{ do: 'say', text: 'Open.' }] },
        { do: [{ do: 'say', text: 'Locked.' }] },
      ],
    })
    addHotspot(l, 'c1r/e', { id: 'elsewhere', rules: [{ do: [{ do: 'say', text: 'Far.' }] }] })
    return l
  }
  const start = () => ({ ...newGame(level()), inventory: ['a', 'key'] })
  const tapDoor = { type: 'tapHotspot', id: 'door' } as const

  test('the first rule whose condition holds runs', () => {
    expect(play(level(), [tapDoor], start()).said).toEqual(['Locked.'])
  })

  test('using an accepted item runs its rule and deselects', () => {
    const { state, said } = play(level(), [{ type: 'tapItem', id: 'key' }, tapDoor], start())
    expect(said.at(-1)).toBe('Unlocked.')
    expect(state.flags['open']).toBe(true)
    expect(state.selected).toBeNull()
    expect(play(level(), [tapDoor], state).said).toEqual(['Open.'])
  })

  test('using an item the hotspot does not accept says "Nothing happens." and deselects', () => {
    const { state, said } = play(level(), [{ type: 'tapItem', id: 'a' }, tapDoor], start())
    expect(said.at(-1)).toBe(NOTHING_HAPPENS)
    expect(state.selected).toBeNull()
    expect(state.flags['open']).toBeUndefined()
  })

  test('only hotspots in the current view can be tapped', () => {
    expect(play(level(), [{ type: 'tapHotspot', id: 'elsewhere' }]).events).toEqual([
      { type: 'error', code: 'UNKNOWN_HOTSPOT', ids: ['elsewhere'] },
    ])
  })
})

describe('the dog', () => {
  function level() {
    const l = baseLevel()
    addHotspot(l, 'c1r/n', { id: 'hole', accepts: [DOG_SLOT], rules: [{ do: [{ do: 'say', text: 'Too deep to reach.' }] }] })
    l.chapters[0].dogMoments.push(
      { id: 'fetch1', role: 'fetch', at: 'hole', do: [{ do: 'dog', act: 'fetch' }, { do: 'give', item: 'key' }] },
      { id: 'sniff1', role: 'sniff', at: 'a', do: [{ do: 'dog', act: 'sniff' }] },
    )
    return l
  }

  test('the dog slot selects and deselects without being an inventory item', () => {
    const once = play(level(), [{ type: 'tapItem', id: DOG_SLOT }])
    expect(once.state.selected).toBe(DOG_SLOT)
    expect(once.state.inventory).toEqual([])
    expect(play(level(), [{ type: 'tapItem', id: DOG_SLOT }], once.state).state.selected).toBeNull()
  })

  test('sending the dog to a hotspot runs its dog moment once', () => {
    const send = [{ type: 'tapItem', id: DOG_SLOT }, { type: 'tapHotspot', id: 'hole' }] as const
    const first = play(level(), [...send])
    expect(first.state.inventory).toEqual(['key'])
    expect(first.state.fired).toEqual(['fetch1'])
    expect(first.events).toContainEqual({ type: 'dog', act: 'fetch' })
    const again = play(level(), [...send], first.state)
    expect(again.said.at(-1)).toBe(fill('{dog} sniffs it, then looks back at you.'))
  })

  test('the dog can sniff an item, from either selection order', () => {
    const start = { ...newGame(level()), inventory: ['a'] }
    for (const order of [['dog', 'a'], ['a', 'dog']]) {
      const { state, events } = play(level(), order.map(id => ({ type: 'tapItem', id })), start)
      expect(state.fired).toEqual(['sniff1'])
      expect(events).toContainEqual({ type: 'dog', act: 'sniff' })
    }
  })
})

describe('beats', () => {
  function level() {
    const l = baseLevel()
    addHotspot(l, 'c1r/n', { id: 'lamp', rules: [{ do: [{ do: 'setFlag', flag: 'lit', value: true }] }] })
    l.chapters[0].beats.push(
      { id: 'after', on: { type: 'afterFlag', flag: 'lit' }, once: true, do: [{ do: 'setFlag', flag: 'chain', value: 1 }] },
      { id: 'chained', on: { type: 'afterFlag', flag: 'chain' }, once: true, do: [{ do: 'say', text: 'Chained.' }] },
      { id: 'onArrive', on: { type: 'arrive', view: 'c1r/e', when: { op: 'flag', flag: 'lit' } }, once: true, do: [{ do: 'say', text: 'Arrived.' }] },
      { id: 'onLeave', on: { type: 'leave', view: 'c1r/n' }, once: true, do: [{ do: 'setFlag', flag: 'moved', value: true }] },
    )
    return l
  }

  test('afterFlag beats fire right after the flag changes, and can chain', () => {
    const { state, events } = play(level(), [{ type: 'tapHotspot', id: 'lamp' }])
    expect(state.fired).toEqual(['after', 'chained'])
    expect(events.filter(e => e.type === 'beat')).toEqual([{ type: 'beat', id: 'after' }, { type: 'beat', id: 'chained' }])
  })

  test('arrive beats wait for their condition and the arrive action', () => {
    const turnAndArrive = [{ type: 'turn', dir: 'right' }, { type: 'arrive' }] as const
    expect(play(level(), [...turnAndArrive]).state.fired).not.toContain('onArrive')
    const lit = play(level(), [{ type: 'tapHotspot', id: 'lamp' }]).state
    const { said } = play(level(), [{ type: 'turn', dir: 'right' }], lit)
    expect(said).toEqual([])
    expect(play(level(), [...turnAndArrive], lit).said).toEqual(['Arrived.'])
  })

  test('leave beats fire when turning away from their view', () => {
    const { state } = play(level(), [{ type: 'turn', dir: 'left' }])
    expect(state.fired).toContain('onLeave')
    expect(state.flags['moved']).toBe(true)
  })

  test('every beat fires at most once', () => {
    const { events } = play(level(), [
      { type: 'tapHotspot', id: 'lamp' },
      { type: 'tapHotspot', id: 'lamp' },
      { type: 'turn', dir: 'left' },
      { type: 'turn', dir: 'right' },
      { type: 'turn', dir: 'left' },
    ])
    expect(events.filter(e => e.type === 'beat').map(e => (e.type === 'beat' ? e.id : ''))).toEqual(['after', 'chained', 'onLeave'])
  })
})

test('step never mutates the state it is given', () => {
  const level = baseLevel()
  addHotspot(level, 'c1r/n', { id: 'h', rules: [{ do: [{ do: 'give', item: 'a' }, { do: 'setFlag', flag: 'x', value: 1 }] }] })
  const before = newGame(level)
  const frozen = structuredClone(before)
  step(level, before, { type: 'tapHotspot', id: 'h' })
  step(level, before, { type: 'turn', dir: 'right' })
  expect(before).toEqual(frozen)
})
