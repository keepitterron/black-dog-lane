// The dog's sounds. Always warm and close, and pitched in a major key, so against the cold
// room sounds a child can hear that the dog is safe. Even the growl is short and soft: it
// sends the dark away, it never threatens the player.
import { getAudio, noise, tone } from './audio.ts'

export const DOG_SOUNDS = ['happyBark', 'sniffing', 'panting', 'tailThump', 'growl'] as const
export type DogSound = (typeof DOG_SOUNDS)[number]

// A "woof": a voiced tone falling a fifth, a formant filter, and a puff of breath.
function woof(at: number, pitch: number): void {
  const audio = getAudio()
  if (!audio) return
  const { ctx, out } = audio
  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.frequency.value = 900
  formant.Q.value = 1.4
  const warm = ctx.createBiquadFilter()
  warm.type = 'lowpass'
  warm.frequency.value = 1800
  formant.connect(warm).connect(out)
  tone(audio, { freq: pitch, to: pitch * 0.67, dur: 0.17, type: 'sawtooth', gain: 0.32, at, dest: formant })
  tone(audio, { freq: pitch * 1.5, to: pitch, dur: 0.12, type: 'triangle', gain: 0.08, at, dest: formant })
  noise(audio, { dur: 0.09, gain: 0.08, freq: 1400, q: 0.8, at })
}

const SOUNDS: Record<DogSound, () => void> = {
  // Two happy barks, the second a major third above the first (D4 → F#4).
  happyBark: () => {
    woof(0, 293.7)
    woof(0.24, 370)
  },
  sniffing: () => {
    const audio = getAudio()
    if (!audio) return
    for (let i = 0; i < 5; i++) noise(audio, { dur: 0.07, gain: 0.12, freq: 3200 + i * 150, type: 'highpass', at: i * 0.11 + (i > 2 ? 0.12 : 0) })
  },
  panting: () => {
    const audio = getAudio()
    if (!audio) return
    for (let i = 0; i < 6; i++) {
      noise(audio, { dur: 0.16, gain: 0.07, freq: 1300, q: 0.7, at: i * 0.26, attack: 0.04 })
      noise(audio, { dur: 0.12, gain: 0.05, freq: 900, q: 0.7, at: i * 0.26 + 0.13, attack: 0.03 })
    }
  },
  // A tail thumping on floorboards.
  tailThump: () => {
    const audio = getAudio()
    if (!audio) return
    for (const at of [0, 0.32, 0.64]) {
      tone(audio, { freq: 110, to: 62, dur: 0.18, gain: 0.3, at })
      noise(audio, { dur: 0.06, gain: 0.18, freq: 220, type: 'lowpass', at })
    }
  },
  // A short, low protective rumble aimed at the dark, ending on a rising "huff".
  growl: () => {
    const audio = getAudio()
    if (!audio) return
    const { ctx, out } = audio
    const t = ctx.currentTime
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 520
    const tremolo = ctx.createGain()
    tremolo.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 24
    const depth = ctx.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(tremolo.gain)
    tremolo.connect(lowpass).connect(out)
    tone(audio, { freq: 98, to: 92, dur: 0.75, type: 'sawtooth', gain: 0.22, dest: tremolo })
    tone(audio, { freq: 147, to: 139, dur: 0.75, type: 'sawtooth', gain: 0.08, dest: tremolo })
    lfo.start(t)
    lfo.stop(t + 0.8)
    noise(audio, { dur: 0.14, gain: 0.1, freq: 700, q: 0.8, at: 0.82, attack: 0.03 })
  },
}

export function playDogSound(sound: DogSound): void {
  SOUNDS[sound]()
}
