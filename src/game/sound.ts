// Procedural sound effects with the Web Audio API — no assets needed.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

export const setSoundEnabled = (on: boolean) => {
  enabled = on
}

function ac(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.55
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slide?: number; filter?: number } = {}) {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t)
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (opts.filter) {
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = opts.filter
    osc.connect(lp)
    node = lp
  }
  node.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; delay?: number; from?: number; to?: number; type?: BiquadFilterType; q?: number } = {}) {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + (opts.delay ?? 0)
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur + 0.05)
  const filt = c.createBiquadFilter()
  filt.type = opts.type ?? 'lowpass'
  filt.Q.value = opts.q ?? 1
  filt.frequency.setValueAtTime(opts.from ?? 2000, t)
  filt.frequency.exponentialRampToValueAtTime(opts.to ?? 100, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.5, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filt).connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}

const vibrate = (p: number | number[]) => {
  // Chrome refuses (and logs an error) before the user has interacted with the page.
  if (enabled && 'vibrate' in navigator && (navigator.userActivation?.hasBeenActive ?? true)) navigator.vibrate(p)
}

export const sfx = {
  click: () => tone(880, 0.06, { type: 'triangle', gain: 0.12 }),
  select: () => {
    tone(520, 0.08, { type: 'triangle', gain: 0.15 })
    tone(780, 0.1, { type: 'triangle', gain: 0.12, delay: 0.05 })
  },
  place: () => {
    tone(160, 0.12, { type: 'sine', gain: 0.4, slide: 70 })
    noise(0.06, { gain: 0.15, from: 4000, to: 800, type: 'highpass' })
  },
  dice: () => {
    for (let i = 0; i < 7; i++)
      noise(0.04, { gain: 0.25, delay: i * 0.055 + Math.random() * 0.02, from: 5000, to: 1500, type: 'bandpass', q: 3 })
  },
  hit: () => {
    noise(0.5, { gain: 0.7, from: 1200, to: 60 })
    tone(90, 0.35, { type: 'sine', gain: 0.5, slide: 35 })
    vibrate(40)
  },
  defend: () => {
    tone(300, 0.15, { type: 'square', gain: 0.08, filter: 1200 })
    noise(0.12, { gain: 0.2, from: 6000, to: 2000, type: 'highpass' })
  },
  conquer: () => {
    noise(0.9, { gain: 0.8, from: 900, to: 40 })
    tone(60, 0.7, { type: 'sine', gain: 0.6, slide: 30 })
    ;[392, 523, 659, 784].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', gain: 0.1, delay: 0.12 + i * 0.09, filter: 2400 }))
    vibrate([60, 40, 90])
  },
  turn: () => {
    tone(440, 0.18, { type: 'triangle', gain: 0.18 })
    tone(660, 0.3, { type: 'triangle', gain: 0.18, delay: 0.12 })
  },
  card: () => noise(0.25, { gain: 0.3, from: 800, to: 6000, type: 'bandpass', q: 2 }),
  trade: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.15, delay: i * 0.07 })),
  eliminated: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, { type: 'sawtooth', gain: 0.12, delay: i * 0.18, filter: 1500 })),
  victory: () => {
    const notes = [523, 523, 523, 659, 784, 659, 784, 1047]
    const times = [0, 0.15, 0.3, 0.45, 0.75, 1.0, 1.15, 1.4]
    notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 1.2 : 0.3, { type: 'sawtooth', gain: 0.14, delay: times[i], filter: 3000 }))
    noise(1.5, { gain: 0.4, from: 800, to: 40, delay: 1.4 })
  },
}
