// 음악 엔진: 반주는 은은한 피아노 왼손 + 현악기, 멜로디(+화음)는 건반을 맞출 때 연주
import { chordAt, chordNotes } from './songs.js'
import { local } from './store.js'
import { makeBand } from './band.js'

let ctx = null
let master = null
let melBus = null
let accBus = null
let padBus = null
let sfxBus = null
let drumBus = null
let band = null
let noiseBuf = null
const KEY = 'piano.sound'
let enabled = local.get(KEY) !== 'off'

const hz = (m) => 440 * 2 ** ((m - 69) / 12)

// 공간 울림(리버브)용 가짜 방 소리
function impulse(sec, decay) {
  const len = Math.floor(ctx.sampleRate * sec)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = enabled ? 1 : 0
    master.connect(comp)
    const rev = ctx.createConvolver()
    rev.buffer = impulse(2.4, 3)
    const revOut = ctx.createGain()
    revOut.gain.value = 0.32
    rev.connect(revOut).connect(master)
    const bus = (gain, send, pan = 0) => {
      const g = ctx.createGain()
      g.gain.value = gain
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null
      if (p) {
        p.pan.value = pan
        g.connect(p).connect(master)
      } else g.connect(master)
      const s = ctx.createGain()
      s.gain.value = send
      g.connect(s).connect(rev)
      return g
    }
    melBus = bus(0.9, 0.45, 0.05)
    accBus = bus(0.78, 0.55, -0.12)
    padBus = bus(0.32, 0.8, 0.1)
    sfxBus = bus(0.45, 0.2)
    drumBus = bus(0.7, 0.18)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    band = makeBand({ ctx, accBus, padBus, drumBus, noiseBuf, pianoNote, strings })
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
  if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05)
}

// ---------------- 피아노 ----------------
const PARTIALS = [1, 0.48, 0.3, 0.16, 0.1, 0.06]

/** 피아노 한 음. hold 면 손 뗄 때(release)까지 길게 울림 */
function pianoNote(midi, t, vel, out, { partials = 6, hold = false } = {}) {
  const f = hz(midi)
  const T = Math.max(0.7, Math.min(3.4, 3.4 - (midi - 36) * 0.045)) * (hold ? 1.8 : 1)
  const g = ctx.createGain()
  g.gain.value = 0.22 * vel
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(Math.min(14000, f * 7 + 2500 * vel), t)
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t + T)
  g.connect(lp).connect(out)
  const oscs = []
  const add = (freq, amp, decay, detune = 0) => {
    const o = ctx.createOscillator()
    const og = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    o.detune.value = detune
    og.gain.setValueAtTime(0.0001, t)
    og.gain.linearRampToValueAtTime(amp, t + 0.004)
    og.gain.exponentialRampToValueAtTime(amp * 0.25, t + 0.12)
    og.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(og).connect(g)
    o.start(t)
    o.stop(t + decay + 0.05)
    oscs.push(o)
  }
  for (let k = 1; k <= partials; k++) {
    const fk = f * k * Math.sqrt(1 + 0.0004 * k * k) // 피아노 줄 특유의 살짝 높은 배음
    if (fk > 16000) break
    add(fk, PARTIALS[k - 1], T / Math.pow(k, 0.7))
  }
  add(f, 0.45, T, 2.5) // 두 줄이 같이 울리는 떨림
  // 해머가 줄을 치는 '톡' 소리
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = Math.min(6000, f * 4)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.06 * vel, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
  s.connect(bp).connect(ng).connect(g)
  s.start(t, Math.random() * 0.5)
  s.stop(t + 0.04)
  return {
    release(at = ctx.currentTime) {
      g.gain.cancelScheduledValues(at)
      g.gain.setValueAtTime(g.gain.value, at)
      g.gain.setTargetAtTime(0, at, 0.09)
      oscs.forEach((o) => {
        try {
          o.stop(at + 0.6)
        } catch {
          // 이미 멈춤
        }
      })
    },
  }
}

/** 부드러운 현악기 (오래 깔리는 화음) */
function strings(midis, t, dur, vel, out) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.06 * vel, t + Math.min(0.5, dur * 0.4))
  g.gain.setValueAtTime(0.06 * vel, t + dur * 0.8)
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1400
  g.connect(lp).connect(out)
  for (const m of midis) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(m)
      o.detune.value = det
      o.connect(g)
      o.start(t)
      o.stop(t + dur + 0.4)
    }
  }
}

function softTick(t, hi) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.value = hi ? 1320 : 990
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.12, t + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  o.connect(g).connect(sfxBus)
  o.start(t)
  o.stop(t + 0.1)
}

// 화음의 음들 (반주 왼손용)
function voicing(sym) {
  const [r, th, fi] = chordNotes(sym)
  const bass = 36 + (r % 12)
  const mid = [r, th, fi].map((p) => 48 + (((p % 12) + 12) % 12)).sort((a, b) => a - b)
  return { bass, mid, third: (th - r + 12) % 12 }
}

// 탭한 멜로디 음 아래에 붙일 화음 음
function harmonyUnder(midi, sym, count) {
  const pcs = chordNotes(sym).map((p) => ((p % 12) + 12) % 12)
  const out = []
  for (let m = midi - 3; m >= midi - 12 && out.length < count; m--) {
    if (pcs.includes(((m % 12) + 12) % 12)) out.push(m)
  }
  return out
}

/** 건반을 맞췄을 때: 멜로디 + 화음 */
export function tapNote(song, chart, note, { vel = 1 } = {}) {
  if (!ctx) return { release() {} }
  const t = ctx.currentTime
  const sym = chordAt(song, chart, note.beat)
  const count = note.len >= 0.45 ? 2 : note.len >= 0.25 ? 1 : 0
  const voices = [pianoNote(note.midi, t, vel, melBus, { hold: note.hold })]
  for (const m of harmonyUnder(note.midi, sym, count)) voices.push(pianoNote(m, t + 0.008, vel * 0.42, melBus, { partials: 4, hold: note.hold }))
  if (note.hold) strings([note.midi], t, note.len, 0.9, padBus)
  return { release: () => voices.forEach((v) => v.release()) }
}

// ---------------- 반주 ----------------
export class Backing {
  constructor(song, chart, startAt) {
    this.song = song
    this.chart = chart
    this.startAt = startAt
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
    while (true) {
      const t = this.startAt + this.step * half + chart.pickup * chart.beatSec
      if (t > ctx.currentTime + 0.2) break
      const beat = chart.pickup + this.step / 2
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
    const mb = beat - chart.intro
    const intro = mb < 0
    const ending = mb >= chart.totalBeats
    const round = intro ? 0 : Math.min(chart.rounds - 1, Math.floor((mb - chart.pickup) / chart.roundLen))
    const hot = round >= 1
    const sym = chordAt(song, chart, Math.max(0, mb))
    const { bass, mid, third } = voicing(sym)
    const B = chart.beatSec
    const bar = Math.floor(this.step / barSteps)

    if (ending) {
      if (s === 0) {
        const P = (m, vel, at = t) => pianoNote(m, at, vel, accBus, { partials: 4 })
        P(bass - 12, 0.6)
        P(bass, 0.6)
        mid.forEach((m, i) => P(m + 12, 0.45, t + 0.04 * i))
        strings([...mid, mid[0] + 12], t, 2.2, 1.2, padBus)
        band.I.crash(t, 0.5)
        band.I.kick(t, 0.6)
      }
      return
    }
    const arrange = band.A[song.arr] || band.A.lullaby
    const pad = arrange({ t, s, meter, B, bar, hot, intro, bass, mid, third, sym })
    // 화음이 바뀔 때 현악기 (편곡마다 크기가 다름)
    if (pad && (s === 0 || (song.chordBeats < meter && s % (song.chordBeats * 2) === 0))) {
      const len = Math.min(B * meter, song.chordBeats * B)
      strings(mid.map((m) => m + 12), t, len, pad * (hot ? 1.2 : 0.9), padBus)
    }
    if (intro && s % 2 === 0 && mb >= -meter) softTick(t, s === 0)
  }
}

// ---------------- 효과음 ----------------
export const sfx = {
  click: () => ctx && softTick(ctx.currentTime, false),
  miss: () => {
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(180, t)
    o.frequency.exponentialRampToValueAtTime(90, t + 0.15)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.18, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g).connect(sfxBus)
    o.start(t)
    o.stop(t + 0.2)
  },
  combo: (n) => {
    if (!ctx) return
    const t = ctx.currentTime
    ;[84, 88, 91, 96].forEach((m, i) => pianoNote(m + (n >= 50 ? 2 : 0), t + i * 0.05, 0.35, sfxBus, { partials: 3 }))
  },
  count: (hi) => ctx && softTick(ctx.currentTime, hi),
  finish: () => {
    if (!ctx) return
    const t = ctx.currentTime
    ;[60, 64, 67, 72, 76, 79, 84].forEach((m, i) => pianoNote(m, t + i * 0.07, 0.55, sfxBus))
    strings([60, 64, 67, 72], t + 0.3, 1.8, 1.2, padBus)
  },
  // 곡 고르기: 앞부분 미리 듣기 (멜로디 + 화음 + 왼손)
  preview(song, chart) {
    if (!ctx) return
    const t0 = ctx.currentTime + 0.05
    const first = chart.notes[0].t
    const end = Math.min(chart.notes.length, 12)
    for (const n of chart.notes.slice(0, end)) {
      const t = t0 + (n.t - first)
      const sym = chordAt(song, chart, n.beat)
      pianoNote(n.midi, t, 0.85, melBus)
      for (const m of harmonyUnder(n.midi, sym, n.len >= 0.45 ? 2 : 1)) pianoNote(m, t + 0.01, 0.35, melBus, { partials: 4 })
      if (Number.isInteger(n.beat - (chart.pickup || 0)) && (n.beat - chart.pickup) % song.meter === 0) {
        pianoNote(voicing(sym).bass, t, 0.5, accBus, { partials: 4 })
      }
    }
  },
}

// 녹음용 (자동 테스트에서 소리를 파일로 남길 때)
export function captureStream() {
  unlockAudio()
  const d = ctx.createMediaStreamDestination()
  master.connect(d)
  return d.stream
}
