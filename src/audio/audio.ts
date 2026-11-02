// One AudioContext for the whole game, created on the first user gesture. iOS starts it
// suspended and can suspend it again, so every tap tries to resume it until it is running.

type Audio = { ctx: AudioContext; out: GainNode }

let audio: Audio | null = null
let muted = readMuted()

const MUTE_KEY = 'bdl:muted'

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockAudio(): void {
  try {
    if (!audio) {
      const ctx = new AudioContext()
      const out = ctx.createGain()
      out.gain.value = muted ? 0 : 0.9
      out.connect(ctx.destination)
      audio = { ctx, out }
    }
    if (audio.ctx.state !== 'running') void audio.ctx.resume().catch(() => undefined)
  } catch {
    audio = null
  }
}

// Call once at startup: resumes audio on every tap, as iOS requires.
export function installAudioUnlock(): void {
  for (const type of ['pointerdown', 'keydown'] as const) addEventListener(type, unlockAudio, { capture: true, passive: true })
}

export function getAudio(): Audio | null {
  return audio?.ctx.state === 'running' ? audio : null
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // Per-device convenience only.
  }
  if (audio) audio.out.gain.setTargetAtTime(value ? 0 : 0.9, audio.ctx.currentTime, 0.05)
}

// Small building blocks shared by every sound.

export function tone(
  { ctx, out }: Audio,
  { freq, to, dur, type = 'sine', gain = 0.12, at = 0, dest = out }: { freq: number; to?: number; dur: number; type?: OscillatorType; gain?: number; at?: number; dest?: AudioNode },
): void {
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(env).connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

export function noise(
  { ctx, out }: Audio,
  { dur, gain = 0.2, freq = 1200, type = 'bandpass', q = 1, at = 0, attack = 0.005 }: { dur: number; gain?: number; freq?: number; type?: BiquadFilterType; q?: number; at?: number; attack?: number },
): void {
  const t = ctx.currentTime + at
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = freq
  filter.Q.value = q
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(env).connect(out)
  src.start(t)
}
