// A playground for the dog: every pose and act, its sounds, the dog's inventory slot, hints
// from the real engine (on the non-secret basic test level), and small fetch and guard scenes.
// Reached from the title screen until the real scene lands in Milestone 4.
import { useCallback, useEffect, useRef, useState } from 'react'
import basic from '../../levels/test/basic.json'
import { DOG_POSES, type DogCarry, type DogPose } from '../art/dog.ts'
import { isMuted, setMuted } from '../audio/audio.ts'
import { DOG_ACTS, fillText, type DogAct } from '../engine/dog.ts'
import { parseLevel } from '../engine/schema.ts'
import { newGame } from '../engine/state.ts'
import { step, type Action } from '../engine/step.ts'
import { Dog } from './dog/Dog.tsx'
import { useDogActor } from './dog/useDogActor.ts'
import styles from './DogLab.module.css'
import { Inventory } from './Inventory.tsx'
import { Message, type MessageItem } from './Message.tsx'

const parsed = parseLevel(basic)
if (!parsed.ok) throw new Error('levels/test/basic.json is invalid')
const level = parsed.level
const HOME_X = 46

export function DogLab() {
  const actor = useDogActor()
  const [still, setStill] = useState<DogPose | null>(null)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [x, setX] = useState(HOME_X)
  const [carry, setCarry] = useState<DogCarry | null>(null)
  const [shadow, setShadow] = useState<'none' | 'there' | 'leaving'>('none')
  const [message, setMessage] = useState<MessageItem | null>(null)
  const [game, setGame] = useState(() => ({ ...newGame(level), inventory: ['key'] }))
  const [muted, setMutedState] = useState(isMuted)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const say = useCallback((text: string) => setMessage({ id: performance.now(), text: fillText(text) }), [])

  const play = useCallback(
    (act: DogAct) => {
      setStill(null)
      actor.play(act)
    },
    [actor],
  )

  // Runs a little scene: each step waits `ms` after the previous one.
  const scene = useCallback((steps: [ms: number, run: () => void][]) => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
    let at = 0
    for (const [ms, run] of steps) {
      at += ms
      timers.current.push(setTimeout(run, at))
    }
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function reset() {
    actor.stop()
    setStill(null)
    setX(HOME_X)
    setFacing('right')
    setCarry(null)
    setShadow('none')
  }

  function dispatch(action: Action) {
    const { state, events } = step(level, game, action)
    setGame(state)
    for (const event of events) {
      if (event.type === 'say') say(event.text)
      if (event.type === 'hint') {
        say(event.text)
        if (event.act) play(event.act)
      }
      if (event.type === 'dog') play(event.act)
    }
  }

  function fetchScene() {
    reset()
    scene([
      [0, () => (play('trot'), setX(118))],
      [1400, () => (setFacing('left'), setCarry('bone'), play('trot'), setX(HOME_X))],
      [1450, () => play('fetch')],
      [1800, () => (setCarry(null), setFacing('right'), say('{dog} drops a bone at your feet, very pleased.'))],
    ])
  }

  function guardScene() {
    reset()
    scene([
      [0, () => (setShadow('there'), say('Something shuffles behind the door.'))],
      [1100, () => (setFacing('left'), play('standGuard'))],
      [1500, () => (setShadow('leaving'), say('The shadows slip away from the door.'))],
      [1300, () => (setShadow('none'), setFacing('right'), play('wag'))],
    ])
  }

  const pose = still ?? actor.pose
  const items = game.inventory.map(id => ({ id, name: level.items[id]?.name ?? id }))

  return (
    <main className={styles.lab}>
      <header className={styles.top}>
        <a href="#" className={styles.pill}>
          ‹ Back
        </a>
        <h1>Meet the dog</h1>
        <button
          type="button"
          className={styles.pill}
          onClick={() => {
            setMuted(!muted)
            setMutedState(!muted)
          }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </header>

      <div className={styles.stage}>
        <svg className={styles.room} viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="lab-light" cx="420" cy="300" r="520" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#e3a84b" stopOpacity=".16" />
              <stop offset="1" stopColor="#0c0907" stopOpacity=".88" />
            </radialGradient>
          </defs>
          <rect width="800" height="470" fill="#4b5442" />
          <rect y="448" width="800" height="24" fill="#3a2a20" />
          <rect y="472" width="800" height="128" fill="#4a3326" />
          <rect x="40" y="150" width="150" height="300" fill="#3b281c" stroke="#24180f" strokeWidth="4" />
          <rect x="42" y="444" width="146" height="6" fill="#d9c9a0" opacity=".55" />
          <g className={styles.shadow} data-state={shadow}>
            <rect x="74" y="441" width="28" height="9" fill="#0a0705" />
            <rect x="124" y="441" width="28" height="9" fill="#0a0705" />
          </g>
          <rect width="800" height="600" fill="url(#lab-light)" />
        </svg>
        <div className={styles.dog} style={{ left: `${x}%` }}>
          <Dog pose={pose} facing={facing} carrying={pose === 'fetch' || pose === 'trot' ? carry : null} />
        </div>
        <Message message={message} />
      </div>

      <Inventory items={items} selected={game.selected} dogBusy={actor.act !== null} onTap={id => dispatch({ type: 'tapItem', id })} />

      <section className={styles.panel}>
        <h2>Scenes</h2>
        <div className={styles.row}>
          <button type="button" onClick={() => dispatch({ type: 'askDog' })}>
            Ask the dog
          </button>
          <button type="button" onClick={fetchScene}>
            Fetch
          </button>
          <button type="button" onClick={guardScene}>
            Guard
          </button>
          <button type="button" onClick={() => setFacing(facing === 'left' ? 'right' : 'left')}>
            Turn around
          </button>
        </div>
        <h2>Acts</h2>
        <div className={styles.row}>
          {DOG_ACTS.map(act => (
            <button key={act} type="button" aria-pressed={actor.act === act} onClick={() => play(act)}>
              {act}
            </button>
          ))}
        </div>
        <h2>Poses</h2>
        <div className={styles.row}>
          {DOG_POSES.map(p => (
            <button key={p} type="button" aria-pressed={pose === p} onClick={() => (actor.stop(), setStill(p))}>
              {p}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
