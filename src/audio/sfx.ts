// Room sounds, ported from the prototype, plus the low room drone. Every id in the level
// schema's SFX list has a sound here.
import type { SFX } from '../engine/schema.ts'
import { getAudio, noise, tone } from './audio.ts'

export type SfxId = (typeof SFX)[number]

const later = (ms: number, run: () => void) => setTimeout(run, ms)

function play(id: SfxId): void {
  const a = getAudio()
  if (!a) return
  switch (id) {
    case 'turn':
      return noise(a, { dur: 0.14, gain: 0.1, freq: 450, type: 'lowpass' })
    case 'pick':
      return tone(a, { freq: 660, to: 990, dur: 0.4, gain: 0.1 })
    case 'click':
      return noise(a, { dur: 0.05, gain: 0.3, freq: 2600 })
    case 'wrong':
      return tone(a, { freq: 150, to: 95, dur: 0.4, type: 'triangle', gain: 0.1 })
    case 'page':
      return noise(a, { dur: 0.3, gain: 0.12, freq: 1800, type: 'highpass' })
    case 'sand':
      for (let i = 0; i < 8; i++) noise(a, { dur: 0.25, gain: 0.12, freq: 2400 + Math.random() * 1500, type: 'highpass', at: i * 0.11 })
      return
    case 'strike':
      noise(a, { dur: 0.22, gain: 0.35, freq: 3200, type: 'highpass' })
      return noise(a, { dur: 0.7, gain: 0.07, freq: 700, at: 0.11 })
    case 'unlock':
      noise(a, { dur: 0.05, gain: 0.35, freq: 2600 })
      noise(a, { dur: 0.05, gain: 0.35, freq: 2000, at: 0.15 })
      return tone(a, { freq: 70, to: 42, dur: 0.9, gain: 0.25, at: 0.32 })
    case 'eerie':
      tone(a, { freq: 392, to: 370, dur: 2.4, gain: 0.045 })
      return tone(a, { freq: 466, to: 438, dur: 2.4, gain: 0.03 })
    case 'sting':
      tone(a, { freq: 98, to: 92, dur: 1.8, type: 'sawtooth', gain: 0.07 })
      tone(a, { freq: 104, to: 99, dur: 1.8, type: 'sawtooth', gain: 0.06 })
      tone(a, { freq: 1244, to: 1180, dur: 1.3, gain: 0.035 })
      return noise(a, { dur: 0.45, gain: 0.35, freq: 90, type: 'lowpass' })
    case 'knock':
      for (const at of [0, 0.42, 0.7]) {
        noise(a, { dur: 0.12, gain: 0.6, freq: 160, type: 'lowpass', at })
        tone(a, { freq: 80, to: 60, dur: 0.22, gain: 0.22, at })
      }
      return
    case 'steps':
      ;[0, 0.65, 1.3, 1.95].forEach((at, i) => noise(a, { dur: 0.12, gain: 0.4 - i * 0.09, freq: 140, type: 'lowpass', at }))
      return
    case 'chime':
      for (const at of [0, 1.1, 2.2]) {
        tone(a, { freq: 196, dur: 3, gain: 0.16, at })
        tone(a, { freq: 392, dur: 2.4, gain: 0.06, at })
        tone(a, { freq: 587, dur: 1.6, gain: 0.03, at })
      }
      return
    case 'whisper':
      for (let i = 0; i < 9; i++) noise(a, { dur: 0.18 + Math.random() * 0.2, gain: 0.06, freq: 1800 + Math.random() * 1800, at: i * 0.16 + Math.random() * 0.09 })
      return
    case 'musicbox':
      ;[659, 587, 523, 494, 523, 440, 415, 440].forEach((f, i) => tone(a, { freq: f * 2, dur: 1.1, gain: 0.03, at: i * 0.42 }))
      return
    case 'tick':
      return noise(a, { dur: 0.025, gain: 0.16, freq: 3400 })
  }
}

export function playSfx(id: SfxId): void {
  play(id)
}

// A low, slowly breathing drone under every room.
let drone: { stop: () => void } | null = null

export function startDrone(): void {
  const a = getAudio()
  if (!a || drone) return
  const { ctx, out } = a
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 300
  const gain = ctx.createGain()
  gain.gain.value = 0.06
  lowpass.connect(gain).connect(out)
  const oscs = ([[55, 'sawtooth', 0.5], [55.6, 'sawtooth', 0.5], [82.4, 'triangle', 0.3]] as const).map(([freq, type, level]) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = level
    osc.connect(g).connect(lowpass)
    osc.start()
    return osc
  })
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.06
  const depth = ctx.createGain()
  depth.gain.value = 130
  lfo.connect(depth).connect(lowpass.frequency)
  lfo.start()
  drone = {
    stop: () => {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
      later(1200, () => [...oscs, lfo].forEach(o => o.stop()))
    },
  }
}

export function stopDrone(): void {
  drone?.stop()
  drone = null
}
