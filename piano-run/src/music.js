// 음악 엔진: 반주(드럼·베이스·화음)는 자동, 멜로디는 건반을 맞출 때 피아노 소리로
import { chordAt, chordNotes } from './songs.js'
import { local } from './store.js'

let ctx = null
let master = null
let backGain = null
let melGain = null
let sfxGain = null
let noiseBuf = null
const KEY = 'piano.sound'
let enabled = local.get(KEY) !== 'off'

const hz = (m) => 440 * 2 ** ((m - 69) / 12)

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 4
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = enabled ? 0.9 : 0
    master.connect(comp)
    backGain = ctx.createGain()
    backGain.gain.value = 0.55
    backGain.connect(master)
    melGain = ctx.createGain()
    melGain.gain.value = 0.75
    melGain.connect(master)
    sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.5
    sfxGain.connect(master)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export const audioTime = () => (ctx ? ctx.currentTime : performance.now() / 1000)
export const outputLatency = () => (ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0)
export const isSoundOn = () => enabled
export function setSound(on) {
  enabled = on
  local.set(KEY, on ? 'on' : 'off')
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05)
}

// ---------------- 악기 ----------------
function env(g, t, a, peak, decay, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(end, t + a + decay)
}

function osc(type, f, t, dur, vol, out, { to, a = 0.005 } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  env(g, t, a, vol, dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + a + dur + 0.05)
}

function noise(t, dur, vol, out, { type = 'highpass', f = 8000, q = 0.7 } = {}) {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const fl = ctx.createBiquadFilter()
  fl.type = type
  fl.frequency.value = f
  fl.Q.value = q
  const g = ctx.createGain()
  env(g, t, 0.002, vol, dur)
  s.connect(fl).connect(g).connect(out)
  s.start(t, Math.random() * 0.5)
  s.stop(t + dur + 0.05)
}

const drum = {
  kick: (t, v = 1) => {
    osc('sine', 150, t, 0.28, 0.9 * v, backGain, { to: 42 })
    osc('triangle', 70, t, 0.12, 0.3 * v, backGain, { to: 40 })
  },
  snare: (t, v = 1) => {
    noise(t, 0.16, 0.45 * v, backGain, { type: 'bandpass', f: 1800, q: 0.8 })
    osc('triangle', 190, t, 0.1, 0.25 * v, backGain, { to: 120 })
  },
  clap: (t, v = 1) => {
    for (const d of [0, 0.012, 0.024]) noise(t + d, 0.09, 0.3 * v, backGain, { type: 'bandpass', f: 1200, q: 1.4 })
  },
  hat: (t, v = 1, open = false) => noise(t, open ? 0.22 : 0.035, 0.16 * v, backGain, { f: 9000 }),
  crash: (t) => noise(t, 1.2, 0.18, backGain, { f: 5000 }),
}

function bass(midi, t, dur, v = 1) {
  const o = ctx.createOscillator()
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  o.type = 'sawtooth'
  o.frequency.value = hz(midi)
  f.type = 'lowpass'
  f.frequency.setValueAtTime(900, t)
  f.frequency.exponentialRampToValueAtTime(180, t + dur)
  env(g, t, 0.006, 0.42 * v, dur)
  o.connect(f).connect(g).connect(backGain)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function stab(notes, t, dur, v = 1) {
  for (const m of notes) {
    osc('square', hz(m), t, dur, 0.045 * v, backGain)
    osc('triangle', hz(m + 12), t, dur * 0.8, 0.03 * v, backGain)
  }
}

function bell(m, t, v = 1) {
  osc('sine', hz(m), t, 0.35, 0.09 * v, backGain)
  osc('sine', hz(m) * 3, t, 0.12, 0.02 * v, backGain)
}

// 피아노 소리 (멜로디). hold 면 손 뗄 때까지 울림
export function piano(midi, { hold = false, vel = 1 } = {}) {
  if (!ctx) return { release() {} }
  const t = ctx.currentTime
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(5200, t)
  f.frequency.exponentialRampToValueAtTime(1600, t + 0.6)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.5 * vel, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.22 * vel, t + 0.25)
  if (!hold) g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
  else g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 1.5)
  g.connect(f).connect(melGain)
  const oscs = [
    ['triangle', 1, 1],
    ['sine', 2, 0.35],
    ['sine', 3, 0.12],
  ].map(([type, mul, v]) => {
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.type = type
    o.frequency.value = hz(midi) * mul
    o.detune.value = (Math.random() - 0.5) * 6
    og.gain.value = v
    o.connect(og).connect(g)
    o.start(t)
    o.stop(t + (hold ? 30 : 1.2))
    return o
  })
  return {
    release() {
      const n = ctx.currentTime
      g.gain.cancelScheduledValues(n)
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), n)
      g.gain.exponentialRampToValueAtTime(0.0001, n + 0.35)
      oscs.forEach((o) => {
        try {
          o.stop(n + 0.4)
        } catch {
          // 이미 멈춤
        }
      })
    },
  }
}

// ---------------- 반주 스케줄러 ----------------
export class Backing {
  constructor(song, chart, startAt) {
    this.song = song
    this.chart = chart
    this.startAt = startAt // ctx 시간: 곡 0초
    this.step = 0
    this.stopped = false
    this.timer = setInterval(() => this.pump(), 25)
    this.pump()
  }

  stop() {
    this.stopped = true
    clearInterval(this.timer)
  }

  pump() {
    if (this.stopped || !ctx) return
    const { song, chart } = this
    const half = chart.beatSec / 2
    const offset = chart.pickup // 마디는 픽업 다음부터
    while (true) {
      const t = this.startAt + (this.step * half) + offset * chart.beatSec
      if (t > ctx.currentTime + 0.15) break
      const beat = offset + this.step / 2 // 곡 시작부터 박
      if (beat >= chart.intro + chart.totalBeats + song.meter) {
        this.stop()
        break
      }
      if (t >= ctx.currentTime - 0.02) this.play(t, beat)
      this.step++
    }
  }

  play(t, beat) {
    const { song, chart } = this
    const meter = song.meter
    const barSteps = meter * 2
    const s = this.step % barSteps
    const bar = Math.floor(this.step / barSteps)
    const mb = beat - chart.intro // 멜로디 박
    const introPart = mb < 0
    const ending = mb >= chart.totalBeats
    const round = introPart ? 0 : Math.min(chart.rounds - 1, Math.floor((mb - chart.pickup) / chart.roundLen))
    const hot = round >= 1 // 두 번째부터 더 신나게
    const sym = chordAt(song, chart, Math.max(0, mb))
    const [r, th, fi] = chordNotes(sym)
    const root = 36 + r
    const triad = [60 + r, 60 + th, 60 + fi].map((m) => (m > 67 ? m - 12 : m))
    const phraseStart = s === 0 && bar % 4 === 0
    const fillBar = bar % 4 === 3 && !introPart

    if (ending) {
      if (s === 0) {
        drum.kick(t)
        drum.crash(t)
        stab(triad, t, 1.4, 1.4)
        bass(root, t, 1.4)
      }
      return
    }
    if (phraseStart && !introPart) drum.crash(t)
    const style = song.style
    if (style === 'waltz') {
      if (s === 0) drum.kick(t)
      if (s === 2 || s === 4) {
        drum.snare(t, 0.45)
        if (!introPart) stab(triad, t, 0.18)
      }
      drum.hat(t, s % 2 ? 0.6 : 1)
      if (!introPart) {
        if (s === 0) bass(root, t, chart.beatSec * 0.9)
        if (s === 4 && hot) bass(root + 7, t, chart.beatSec * 0.6)
        if (hot && s % 2 === 1) bell(triad[(s >> 1) % 3] + 12, t, 0.6)
      }
    } else if (style === 'arp') {
      if (s === 0) drum.kick(t)
      if (s === 3 && hot) drum.clap(t, 0.8)
      drum.hat(t, 0.5)
      if (!introPart) {
        const arp = [root + 12, root + 19, root + 24, triad[1] + 12, root + 24, root + 19]
        bell(arp[s % arp.length], t, 0.8)
        if (s === 0) bass(root, t, chart.beatSec * 2.5, 0.8)
      }
    } else if (style === 'march') {
      if (s === 0 || s === 2) drum.kick(t)
      if (s === 1 || s === 3) drum.snare(t, 0.7)
      drum.hat(t, 0.8)
      if (hot) drum.hat(t + chart.beatSec / 4, 0.4)
      if (!introPart) {
        bass(s % 2 ? root + 7 : root, t, chart.beatSec * 0.4)
        if (s % 2) stab(triad, t, 0.1)
      }
    } else {
      // pop 4/4
      if (s === 0 || s === 4 || (hot && s === 7)) drum.kick(t)
      if (s === 2 || s === 6) {
        drum.snare(t, 0.8)
        if (hot) drum.clap(t, 0.6)
      }
      drum.hat(t, s % 2 ? 0.55 : 0.9, s === 7 && hot)
      if (!introPart) {
        bass(s % 2 ? root + 12 : root, t, chart.beatSec * 0.42, s % 2 ? 0.7 : 1)
        if (s % 2 === 1) stab(triad, t, 0.12, hot ? 1.2 : 0.8)
        if (hot && (s === 0 || s === 3 || s === 6)) bell(triad[s % 3] + 24, t, 0.5)
      }
    }
    if (fillBar && s >= barSteps - 2) {
      drum.snare(t, 0.5)
      drum.snare(t + chart.beatSec / 4, 0.6)
    }
    if (introPart && s % 2 === 0 && mb >= -meter) {
      // 시작 직전 마디: 딸깍 카운트
      osc('square', s === 0 ? 1568 : 1046, t, 0.05, 0.08, sfxGain)
    }
  }
}

// ---------------- 메뉴 음악 (귀여운 반복) ----------------
let menuTimer = null
export function startMenuMusic() {
  if (!ctx || menuTimer) return
  const bpm = 118
  const half = 60 / bpm / 2
  const chords = ['C', 'Am', 'F', 'G']
  const mel = [76, 79, 84, 79, 81, 79, 76, 72, 74, 77, 81, 77, 79, 77, 74, 71, 72, 76, 79, 76, 77, 76, 72, 69, 71, 74, 79, 74, 76, 79, 83, 84]
  let step = 0
  let next = ctx.currentTime + 0.1
  menuTimer = setInterval(() => {
    while (next < ctx.currentTime + 0.15) {
      const s = step % 8
      const bar = Math.floor(step / 8) % 4
      const [r, th, fi] = chordNotes(chords[bar])
      if (s === 0 || s === 4) drum.kick(next, 0.6)
      if (s === 2 || s === 6) drum.clap(next, 0.5)
      drum.hat(next, 0.4)
      bass(36 + r + (s % 2 ? 12 : 0), next, half * 0.8, 0.6)
      if (s % 2 === 1) stab([60 + r, 60 + th, 60 + fi].map((m) => (m > 67 ? m - 12 : m)), next, 0.1, 0.6)
      const m = mel[step % mel.length]
      if (step % 2 === 0) bell(m, next, 1.3)
      next += half
      step++
    }
  }, 30)
}

export function stopMenuMusic() {
  clearInterval(menuTimer)
  menuTimer = null
}

// ---------------- 효과음 ----------------
export const sfx = {
  click: () => ctx && osc('triangle', 880, ctx.currentTime, 0.06, 0.15, sfxGain, { to: 1320 }),
  miss: () => {
    if (!ctx) return
    osc('sine', 160, ctx.currentTime, 0.18, 0.35, sfxGain, { to: 70 })
  },
  combo: (n) => {
    if (!ctx) return
    const t = ctx.currentTime
    ;[72, 76, 79, 84].forEach((m, i) => osc('square', hz(m + (n >= 50 ? 5 : 0)), t + i * 0.05, 0.12, 0.08, sfxGain))
  },
  count: (hi) => ctx && osc('square', hi ? 1046 : 523, ctx.currentTime, hi ? 0.35 : 0.12, 0.16, sfxGain),
  finish: () => {
    if (!ctx) return
    const t = ctx.currentTime
    ;[72, 76, 79, 84, 88].forEach((m, i) => osc('square', hz(m), t + i * 0.09, 0.2, 0.12, sfxGain))
    ;[60, 64, 67, 72].forEach((m) => osc('triangle', hz(m), t + 0.5, 1.2, 0.12, sfxGain))
  },
  // 곡 고르기: 앞부분 미리 듣기
  preview(chart) {
    if (!ctx) return
    const t0 = ctx.currentTime + 0.05
    const first = chart.notes[0].t
    for (const n of chart.notes.slice(0, 10)) {
      const t = t0 + (n.t - first)
      osc('triangle', hz(n.midi), t, Math.min(n.len, 0.6), 0.3, melGain)
      osc('sine', hz(n.midi) * 2, t, Math.min(n.len, 0.4), 0.08, melGain)
    }
  },
}
