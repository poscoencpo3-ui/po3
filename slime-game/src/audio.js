// 음악·효과음은 모두 Web Audio로 직접 만들어서 파일이 필요 없음
import { local } from './store.js'

let ctx = null
let master = null
let musicGain = null
let sfxGain = null
let noiseBuf = null
let musicTimer = null
let nextNoteTime = 0
let step = 0

const KEY = 'slime.sound'
let enabled = local.get(KEY) !== 'off'

const midi = (n) => 440 * 2 ** ((n - 69) / 12)

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = enabled ? 1 : 0
    master.connect(ctx.destination)
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.32
    musicGain.connect(master)
    sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.7
    sfxGain.connect(master)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
}

export const isSoundOn = () => enabled

export function setSound(on) {
  enabled = on
  local.set(KEY, on ? 'on' : 'off')
  if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05)
}

function tone({ freq, to, type = 'square', start = 0, dur = 0.15, vol = 0.3, attack = 0.005, out = sfxGain, vibrato = 0 }) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  if (vibrato) {
    const lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = 18
    lg.gain.value = vibrato
    lfo.connect(lg).connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + dur + 0.05)
  }
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise({ start = 0, dur = 0.1, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', out = sfxGain }) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(f).connect(g).connect(out)
  s.start(t)
  s.stop(t + dur + 0.02)
}

export const sfx = {
  click: () => tone({ freq: 880, to: 1320, dur: 0.07, vol: 0.15 }),
  jump: () => tone({ freq: 330, to: 880, dur: 0.16, vol: 0.18 }),
  land: () => {
    tone({ freq: 260, to: 140, type: 'sine', dur: 0.22, vol: 0.4, vibrato: 30 })
    noise({ dur: 0.08, vol: 0.12, freq: 600 })
  },
  fall: () => {
    tone({ freq: 1100, to: 180, type: 'sine', dur: 0.9, vol: 0.3 })
    tone({ freq: 140, to: 60, type: 'sine', start: 0.85, dur: 0.3, vol: 0.4 })
  },
  eaten: () => {
    noise({ dur: 0.09, vol: 0.5, freq: 400, q: 2 })
    noise({ start: 0.18, dur: 0.09, vol: 0.5, freq: 350, q: 2 })
    tone({ freq: 120, to: 70, type: 'sine', start: 0.05, dur: 0.5, vol: 0.5, vibrato: 25 })
    ;[72, 69, 64].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', start: 0.55 + i * 0.16, dur: 0.18, vol: 0.25 }))
  },
  monsterHop: (vol = 0.25) => tone({ freq: 160, to: 70, type: 'sine', dur: 0.3, vol, vibrato: 12 }),
  monsterThud: (vol = 0.5) => {
    tone({ freq: 90, to: 35, type: 'sine', dur: 0.45, vol })
    noise({ dur: 0.25, vol: vol * 0.5, freq: 200, type: 'lowpass' })
  },
  monsterGrowl: () => tone({ freq: 110, to: 160, type: 'sawtooth', dur: 0.45, vol: 0.09, vibrato: 20 }),
  ladderStep: (i) => tone({ freq: midi(67 + (i % 8) * 2), type: 'triangle', dur: 0.08, vol: 0.2 }),
  slide: () => {
    tone({ freq: 500, to: 1400, type: 'triangle', dur: 0.35, vol: 0.22 })
    tone({ freq: 1400, to: 500, type: 'triangle', start: 0.35, dur: 0.4, vol: 0.18 })
  },
  win: () => {
    ;[72, 76, 79, 84].forEach((n, i) => tone({ freq: midi(n), type: 'square', start: i * 0.11, dur: 0.16, vol: 0.18 }))
    ;[72, 76, 79, 84].forEach((n) => tone({ freq: midi(n), type: 'triangle', start: 0.5, dur: 0.8, vol: 0.12 }))
  },
  beep: (hi) => tone({ freq: hi ? 1046 : 523, type: 'square', dur: hi ? 0.4 : 0.16, vol: 0.18 }),
  chime: () => [84, 88].forEach((n, i) => tone({ freq: midi(n), type: 'sine', start: i * 0.09, dur: 0.3, vol: 0.2 })),
  splash: () => noise({ dur: 0.3, vol: 0.25, freq: 900, q: 0.7 }),
  flap: (i = 0) => {
    noise({ dur: 0.09, vol: 0.18, freq: 1400 + i * 200, q: 0.8 })
    tone({ freq: 520 + i * 90, to: 780 + i * 90, type: 'triangle', dur: 0.1, vol: 0.12 })
  },
  tired: () => tone({ freq: 300, to: 200, type: 'triangle', dur: 0.15, vol: 0.12 }),
  star: (i = 0) => tone({ freq: midi(84 + (i % 5) * 2), type: 'sine', dur: 0.18, vol: 0.2 }),
  perfect: () => [79, 84, 88].forEach((n, i) => tone({ freq: midi(n), type: 'square', start: i * 0.06, dur: 0.1, vol: 0.12 })),
  box: () => {
    for (let i = 0; i < 8; i++) tone({ freq: midi(72 + ((i * 5) % 12)), type: 'square', start: i * 0.08, dur: 0.06, vol: 0.1 })
  },
  item: () => [76, 83, 88].forEach((n, i) => tone({ freq: midi(n), type: 'triangle', start: i * 0.07, dur: 0.14, vol: 0.2 })),
  shield: () => tone({ freq: 400, to: 1200, type: 'sine', dur: 0.4, vol: 0.2, vibrato: 40 }),
  freeze: () => {
    ;[96, 91, 88, 84].forEach((n, i) => tone({ freq: midi(n), type: 'sine', start: i * 0.05, dur: 0.3, vol: 0.12 }))
    noise({ dur: 0.4, vol: 0.12, freq: 6000, type: 'highpass' })
  },
  bonk: () => {
    tone({ freq: 700, to: 300, type: 'square', dur: 0.12, vol: 0.18 })
    tone({ freq: 900, to: 1500, type: 'sine', start: 0.1, dur: 0.2, vol: 0.15 })
  },
  sticky: () => tone({ freq: 220, to: 90, type: 'sawtooth', dur: 0.35, vol: 0.12, vibrato: 30 }),
  portal: () => {
    tone({ freq: 300, to: 1600, type: 'sine', dur: 0.5, vol: 0.2, vibrato: 50 })
    tone({ freq: 1600, to: 400, type: 'sine', start: 0.45, dur: 0.4, vol: 0.15, vibrato: 50 })
  },
  spring: () => {
    tone({ freq: 150, to: 900, type: 'square', dur: 0.25, vol: 0.15, vibrato: 60 })
    tone({ freq: 220, to: 120, type: 'sine', dur: 0.3, vol: 0.3 })
  },
  crack: () => noise({ dur: 0.18, vol: 0.3, freq: 2500, q: 3 }),
}

// ---------- 배경 음악: 귀여운 8마디 반복 ----------
const R = null
const MELODY = [
  76, 79, 84, 79, 81, 79, 76, R,
  77, 81, 84, 81, 79, 77, 76, 74,
  74, 79, 83, 79, 81, 79, 77, 74,
  76, 72, 76, 79, 84, R, 79, R,
  81, 84, 88, 84, 83, 81, 79, 76,
  77, 81, 84, 81, 79, 77, 76, 77,
  79, 83, 86, 83, 84, 83, 81, 79,
  84, 79, 76, 79, 72, R, R, R,
]
const BASS = [48, 41, 43, 48, 45, 41, 43, 48]
const TEMPO = 0.2 // 8분음표 길이(초)

function scheduleStep(i, t) {
  const n = MELODY[i % 64]
  const bar = Math.floor((i % 64) / 8)
  const beat = i % 8
  if (n) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = midi(n)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.13, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + TEMPO * 0.9)
    o.connect(g).connect(musicGain)
    o.start(t)
    o.stop(t + TEMPO)
    // 반짝이는 한 옥타브 위 종소리
    const o2 = ctx.createOscillator()
    const g2 = ctx.createGain()
    o2.type = 'sine'
    o2.frequency.value = midi(n + 12)
    g2.gain.setValueAtTime(0.05, t)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    o2.connect(g2).connect(musicGain)
    o2.start(t)
    o2.stop(t + 0.32)
  }
  if (beat % 2 === 0) {
    const root = BASS[bar] + (beat === 2 || beat === 6 ? 7 : 0)
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = midi(root)
    g.gain.setValueAtTime(0.28, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + TEMPO * 1.8)
    o.connect(g).connect(musicGain)
    o.start(t)
    o.stop(t + TEMPO * 2)
  }
  if (beat % 2 === 1) noise({ start: t - ctx.currentTime, dur: 0.04, vol: 0.06, freq: 7000, type: 'highpass', out: musicGain })
  if (beat === 0 || beat === 4) tone({ freq: 140, to: 50, type: 'sine', start: t - ctx.currentTime, dur: 0.15, vol: 0.35, out: musicGain })
}

export function startMusic() {
  if (!ctx || musicTimer) return
  nextNoteTime = ctx.currentTime + 0.1
  step = 0
  musicTimer = setInterval(() => {
    while (nextNoteTime < ctx.currentTime + 0.25) {
      scheduleStep(step++, nextNoteTime)
      nextNoteTime += TEMPO
    }
  }, 50)
}

export function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = null
}
