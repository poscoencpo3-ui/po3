// 피아노 달리기: 내려오는 건반을 박자에 맞춰 톡! 콤보만큼 아래 캐릭터가 빨리 달려요
import { Backing, tapNote, sfx, audioTime, outputLatency } from './music.js'
import { Scene, star } from './scene.js'
import { drawChar } from './chars.js'
import { rng, clamp, lerp } from './rng.js'

export const WIN = { perfect: 0.075, good: 0.14, bad: 0.21 }
const PTS = { perfect: 3, good: 2, bad: 0.5, miss: 0 }
const SCORE = { perfect: 100, good: 60, bad: 20, miss: 0 }
const LANE_COLORS = [
  ['#ffb3cf', '#ff7eb0'],
  ['#ffd59e', '#ffb04d'],
  ['#b5ecc8', '#5fd08f'],
  ['#b9d4ff', '#6d9dff'],
]
const KEYS = { d: 0, f: 1, j: 2, k: 3, a: 0, s: 1, l: 3, ';': 3 }
const JUDGE_STYLE = {
  perfect: { text: 'PERFECT', color: '#ff5c9a' },
  good: { text: 'GOOD', color: '#2fbf7a' },
  bad: { text: 'BAD', color: '#9a7ab8' },
  miss: { text: 'MISS', color: '#8a8a9a' },
}

// 만점 진행도 (모두 PERFECT 일 때) → 경주 결승선
function maxProgress(chart) {
  let combo = 0
  let sum = 0
  for (const n of chart.notes) {
    for (let k = 0; k < (n.hold ? 2 : 1); k++) {
      combo++
      sum += PTS.perfect * (1 + Math.min(combo, 40) / 40)
    }
  }
  return sum
}

export class PianoGame {
  constructor(canvas, { song, chart, theme, fall = 2, me, rivals = [], race = false, onEnd, onSend, onHud }) {
    this.cv = canvas
    this.g = canvas.getContext('2d')
    this.song = song
    this.chart = chart
    this.race = race
    this.onEnd = onEnd || (() => {})
    this.onSend = onSend || (() => {})
    this.onHud = onHud || (() => {})
    this.scene = new Scene(theme)
    this.fall = fall
    this.notes = chart.notes.map((n) => ({ ...n, judged: null, tail: null, holding: null }))
    this.max = maxProgress(chart)
    this.stats = { score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, bad: 0, miss: 0 }
    this.prog = 0
    this.runners = [{ id: me.id, name: me.name, char: me.char, hat: me.hat, me: true, prog: 0, shown: 0, phase: 0, combo: 0 }]
    for (const r of rivals) {
      this.runners.push({ ...r, prog: 0, shown: 0, phase: Math.random() * 6, combo: 0, rng: r.cpu ? rng(r.seed || 7) : null, ptr: 0, cpuCombo: 0 })
    }
    this.fx = []
    this.parts = []
    this.judge = null
    this.comboT = -9
    this.keyDown = [0, 0, 0, 0]
    this.pointers = new Map()
    this.startPerf = Infinity
    this.done = false
    this.lastSend = 0
    this.lastCount = 9
    this.running = true
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onKey = this.onKey.bind(this)
    this.resize = this.resize.bind(this)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKey)
    window.addEventListener('resize', this.resize)
    this.resize()
    const loop = () => {
      if (!this.running) return
      this.frame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  // delay 초 뒤에 곡 시작 (반주는 오디오 시계, 화면·판정은 같은 순간에 맞춤)
  begin(delay = 1.2) {
    const a = audioTime()
    this.backing = new Backing(this.song, this.chart, a + delay)
    this.startPerf = performance.now() / 1000 + delay + outputLatency()
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.backing?.stop()
    for (const n of this.notes) n.sound?.release()
    this.cv.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKey)
    window.removeEventListener('resize', this.resize)
  }

  get t() {
    return performance.now() / 1000 - this.startPerf
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const w = this.cv.clientWidth
    const h = this.cv.clientHeight
    this.cv.width = Math.round(w * dpr)
    this.cv.height = Math.round(h * dpr)
    this.dpr = dpr
    const top = 60
    const trackH = clamp(Math.round(h * 0.22), 130, 190)
    const fieldBottom = h - trackH
    const lw = Math.min(w - 20, 460)
    const lx = (w - lw) / 2
    const keyH = 62
    this.L = { w, h, top, trackH, fieldBottom, lx, lw, laneW: lw / 4, hitY: fieldBottom - keyH, keyH }
  }

  laneOf(px) {
    const L = this.L
    const k = Math.floor((px - L.lx) / L.laneW)
    return k >= 0 && k < 4 ? k : -1
  }

  // ---------------- 입력 ----------------
  onPointerDown(e) {
    e.preventDefault()
    const r = this.cv.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    if (y > this.L.fieldBottom + 10) return
    const lane = this.laneOf(x)
    if (lane < 0) return
    this.press(lane, 'p' + e.pointerId)
  }

  onPointerUp(e) {
    this.release('p' + e.pointerId)
  }

  onKey(e) {
    const lane = KEYS[e.key?.toLowerCase()]
    if (lane === undefined || e.repeat) return
    if (e.type === 'keydown') this.press(lane, 'k' + lane)
    else this.release('k' + lane)
  }

  press(lane, id) {
    const t = this.t
    this.keyDown[lane] = t
    this.pointers.set(id, { lane, note: null })
    if (t < -0.5 || this.done) return
    let best = null
    for (const n of this.notes) {
      if (n.lane !== lane || n.judged) continue
      const d = Math.abs(t - n.t)
      if (d <= WIN.bad && (!best || d < Math.abs(t - best.t))) best = n
      if (n.t - t > WIN.bad) break
    }
    if (!best) return
    const d = Math.abs(t - best.t)
    const j = d <= WIN.perfect ? 'perfect' : d <= WIN.good ? 'good' : 'bad'
    best.judged = j
    best.sound = tapNote(this.song, this.chart, best, { vel: j === 'bad' ? 0.55 : j === 'good' ? 0.85 : 1 })
    if (best.hold) {
      best.holding = id
      this.pointers.get(id).note = best
    } else {
      setTimeout(() => best.sound?.release(), (best.len + 0.25) * 1000)
    }
    this.apply(j, lane, t)
  }

  release(id) {
    const p = this.pointers.get(id)
    this.pointers.delete(id)
    if (!p) return
    this.keyDown[p.lane] = 0
    const n = p.note
    if (!n || n.tail || n.holding !== id) return
    const t = this.t
    n.holding = null
    n.sound?.release()
    const left = n.end - t
    const j = left <= 0.15 ? 'perfect' : left <= 0.35 ? 'good' : 'miss'
    n.tail = j
    this.apply(j, n.lane, t, true)
  }

  // 판정 반영: 점수·콤보·경주 진행
  apply(j, lane, t, tail = false) {
    const s = this.stats
    s[j]++
    if (j === 'perfect' || j === 'good') {
      s.combo++
      s.maxCombo = Math.max(s.maxCombo, s.combo)
      if (s.combo % 10 === 0) {
        this.comboT = t
        sfx.combo(s.combo)
        this.scene.celebrate(t)
        this.burst(this.L.lx + this.L.lw / 2, this.L.hitY - 160, 18, true)
      }
    } else {
      s.combo = 0
      if (j === 'miss') sfx.miss()
    }
    s.score += SCORE[j] + (j === 'miss' ? 0 : Math.min(s.combo, 100) * 2)
    this.prog += PTS[j] * (1 + Math.min(s.combo, 40) / 40)
    this.judge = { j, t, tail }
    if (j !== 'miss') {
      const L = this.L
      const x = L.lx + L.laneW * (lane + 0.5)
      this.fx.push({ x, y: L.hitY, t, lane, j })
      this.burst(x, L.hitY, j === 'perfect' ? 10 : 5)
    }
    this.hud()
  }

  hud() {
    this.onHud({ score: this.stats.score, combo: this.stats.combo })
  }

  // ---------------- 친구 ----------------
  remote(id, type, d) {
    const r = this.runners.find((x) => x.id === id)
    if (!r) return
    if (type === 'prog') {
      r.prog = d.p
      r.combo = d.c
      r.score = d.s
    } else if (type === 'fin') {
      r.prog = d.p
      r.score = d.s
      r.fin = true
    }
  }

  removeRunner(id) {
    this.runners = this.runners.filter((r) => r.me || r.id !== id)
  }

  // 컴퓨터 친구 (혼자 하기): 실력에 맞춰 판정을 굴림
  stepCpu(r, t) {
    while (r.ptr < this.notes.length && this.notes[r.ptr].t <= t) {
      const n = this.notes[r.ptr++]
      for (let k = 0; k < (n.hold ? 2 : 1); k++) {
        const x = r.rng()
        const j = x < r.cpu * 0.7 ? 'perfect' : x < r.cpu ? 'good' : x < r.cpu + 0.08 ? 'bad' : 'miss'
        r.cpuCombo = j === 'perfect' || j === 'good' ? r.cpuCombo + 1 : 0
        r.raw = (r.raw || 0) + PTS[j] * (1 + Math.min(r.cpuCombo, 40) / 40)
        r.score = (r.score || 0) + SCORE[j] + (j === 'miss' ? 0 : Math.min(r.cpuCombo, 100) * 2)
      }
      r.prog = r.raw / this.max
      r.combo = r.cpuCombo
    }
  }

  // ---------------- 효과 ----------------
  burst(x, y, n, big = false) {
    const space = this.scene.theme === 'space'
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * (big ? 6 : 2.4)
      const v = (big ? 260 : 160) * (0.5 + Math.random())
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.7,
        max: 0.7,
        r: 4 + Math.random() * 4,
        c: space ? ['#fff36b', '#9fd4ff', '#ffb3e6'][i % 3] : ['#ffb3cf', '#fff', '#ffe27a'][i % 3],
        k: space || i % 2 ? 'star' : 'petal',
        rot: Math.random() * 6,
      })
    }
  }

  // ---------------- 매 프레임 ----------------
  frame() {
    const now = performance.now() / 1000
    const dt = Math.min(0.05, now - (this.prev || now))
    this.prev = now
    const t = this.t
    const firstT = this.notes[0]?.t ?? 0
    const beatsLeft = Math.ceil((firstT - t) / this.chart.beatSec)
    if (beatsLeft <= 3 && beatsLeft >= 1 && beatsLeft < this.lastCount) {
      this.lastCount = beatsLeft
    }
    if (!this.done) {
      for (const n of this.notes) {
        if (n.t - t > WIN.bad) break
        if (!n.judged && t - n.t > WIN.bad) {
          n.judged = 'miss'
          if (n.hold) n.tail = 'miss'
          this.apply('miss', n.lane, t)
          if (n.hold) this.apply('miss', n.lane, t, true)
        }
        if (n.holding && !n.tail && t >= n.end) {
          n.tail = 'perfect'
          n.holding = null
          n.sound?.release()
          this.apply('perfect', n.lane, t, true)
        }
        if (n.holding && Math.random() < 0.5) {
          const L = this.L
          this.burst(L.lx + L.laneW * (n.lane + 0.5), L.hitY, 1)
        }
      }
      for (const r of this.runners) if (r.cpu) this.stepCpu(r, t)
      const me = this.runners[0]
      me.prog = this.prog / this.max
      me.combo = this.stats.combo
      me.score = this.stats.score
      if (this.race && now - this.lastSend > 0.4) {
        this.lastSend = now
        this.onSend('prog', { p: Math.round(me.prog * 1000) / 1000, c: this.stats.combo, s: this.stats.score })
      }
      if (t > this.chart.duration) this.finish()
    }
    for (const q of this.parts) {
      q.life -= dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.vy += 300 * dt
      q.vx *= 0.97
    }
    this.parts = this.parts.filter((q) => q.life > 0)
    this.fx = this.fx.filter((f) => t - f.t < 0.4)
    this.draw(t, now, dt)
  }

  finish() {
    this.done = true
    const s = this.stats
    const total = this.notes.reduce((k, n) => k + (n.hold ? 2 : 1), 0)
    const acc = (s.perfect + s.good * 0.7 + s.bad * 0.3) / total
    const grade = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D'
    const me = this.runners[0]
    me.prog = this.prog / this.max
    if (this.race) this.onSend('fin', { p: Math.round(me.prog * 1000) / 1000, s: s.score })
    sfx.finish()
    this.onEnd({ ...s, acc, grade, prog: me.prog, total })
  }

  places() {
    return [...this.runners].sort((a, b) => b.prog - a.prog)
  }

  // ---------------- 그리기 ----------------
  draw(t, now, dt) {
    const g = this.g
    const L = this.L
    const dpr = this.dpr
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.scene.drawSky(g, L.w, L.h, now, dt)
    const space = this.scene.theme === 'space'

    // 건반 길
    for (let i = 0; i < 4; i++) {
      const x = L.lx + L.laneW * i
      g.fillStyle = space ? (i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.11)') : i % 2 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.4)'
      g.fillRect(x + 2, L.top, L.laneW - 4, L.hitY - L.top)
      const down = this.keyDown[i] && t - this.keyDown[i] < 10
      if (down) {
        const gr = g.createLinearGradient(0, L.hitY - 220, 0, L.hitY)
        gr.addColorStop(0, 'rgba(255,255,255,0)')
        gr.addColorStop(1, LANE_COLORS[i][0] + 'aa')
        g.fillStyle = gr
        g.fillRect(x + 2, L.hitY - 220, L.laneW - 4, 220)
      }
    }
    // 판정선
    g.strokeStyle = space ? 'rgba(255,240,150,0.9)' : 'rgba(255,92,154,0.85)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(L.lx, L.hitY)
    g.lineTo(L.lx + L.lw, L.hitY)
    g.stroke()

    // 내려오는 건반
    const speed = (L.hitY - L.top) / this.fall
    g.save()
    g.beginPath()
    g.rect(L.lx, L.top, L.lw, L.hitY - L.top + 30)
    g.clip()
    for (const n of this.notes) {
      if (n.t - t > this.fall + 0.2) break
      const endY = L.hitY - (n.end - t) * speed
      if (n.hold) {
        if (n.tail || (n.judged === 'miss' && endY > L.hitY + 40)) continue
      } else if (n.judged) continue
      this.drawNote(g, n, t, speed, now)
    }
    g.restore()

    // 건반 (판정선 아래)
    for (let i = 0; i < 4; i++) {
      const x = L.lx + L.laneW * i
      const down = !!this.keyDown[i]
      const [c1, c2] = LANE_COLORS[i]
      g.fillStyle = down ? c2 : c1
      this.round(g, x + 3, L.hitY + 4 + (down ? 3 : 0), L.laneW - 6, L.keyH - 10, 12)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.5)'
      this.round(g, x + 9, L.hitY + 9 + (down ? 3 : 0), L.laneW - 18, 10, 5)
      g.fill()
      g.fillStyle = 'rgba(90,60,110,0.55)'
      g.font = '22px sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(['♪', '♫', '♩', '♬'][i], x + L.laneW / 2, L.hitY + L.keyH / 2 + 4 + (down ? 3 : 0))
    }
    // 맞춘 자리 반짝
    for (const f of this.fx) {
      const k = (t - f.t) / 0.4
      g.strokeStyle = `rgba(255,255,255,${1 - k})`
      g.lineWidth = 6 * (1 - k) + 1
      g.beginPath()
      g.ellipse(f.x, f.y, (L.laneW * 0.35) * (1 + k), 18 * (1 + k), 0, 0, Math.PI * 2)
      g.stroke()
    }
    for (const q of this.parts) {
      g.globalAlpha = clamp(q.life / q.max, 0, 1)
      g.fillStyle = q.c
      if (q.k === 'star') star(g, q.x, q.y, q.r * 1.4)
      else {
        g.save()
        g.translate(q.x, q.y)
        g.rotate(q.rot + q.life * 6)
        g.beginPath()
        g.ellipse(0, 0, q.r * 1.6, q.r, 0, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
    }
    g.globalAlpha = 1

    this.drawCombo(g, t)
    this.drawRace(g, t, now, dt)
    this.drawIntro(g, t)
  }

  drawNote(g, n, t, speed, now) {
    const L = this.L
    const x = L.lx + L.laneW * n.lane + 5
    const w = L.laneW - 10
    const h = 46
    let y = L.hitY - (n.t - t) * speed
    const [c1, c2] = LANE_COLORS[n.lane]
    if (n.hold) {
      const endY = L.hitY - (n.end - t) * speed
      const held = !!n.holding
      if (held) y = L.hitY
      const top = Math.min(endY, y)
      g.fillStyle = held ? c1 : c1 + 'cc'
      this.round(g, x + w * 0.18, top, w * 0.64, y - top, 14)
      g.fill()
      // 줄무늬
      g.save()
      this.round(g, x + w * 0.18, top, w * 0.64, y - top, 14)
      g.clip()
      g.fillStyle = 'rgba(255,255,255,0.35)'
      const off = (now * 120) % 28
      for (let yy = top - 28 + off; yy < y; yy += 28) g.fillRect(x, yy, w, 10)
      g.restore()
      g.fillStyle = '#fff6a8'
      star(g, x + w / 2, endY, 12)
      if (held) {
        g.fillStyle = 'rgba(255,255,255,0.6)'
        g.beginPath()
        g.ellipse(x + w / 2, L.hitY, w * 0.55, 16 + Math.sin(now * 20) * 3, 0, 0, Math.PI * 2)
        g.fill()
        return
      }
    }
    if (n.judged === 'miss') g.globalAlpha = 0.35
    // 타일: 동글동글 젤리 건반 + 얼굴
    g.fillStyle = c2
    this.round(g, x, y - h + 4, w, h, 14)
    g.fill()
    g.fillStyle = c1
    this.round(g, x, y - h, w, h - 4, 14)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.6)'
    this.round(g, x + 8, y - h + 6, w * 0.35, 8, 4)
    g.fill()
    const cx = x + w / 2
    const cy = y - h / 2 - 2
    g.fillStyle = '#5a3d5c'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(cx + s * 9, cy - 2, 3, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = '#5a3d5c'
    g.lineWidth = 2
    g.beginPath()
    g.arc(cx, cy + 2, 4, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.fillStyle = 'rgba(255,110,150,0.45)'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.ellipse(cx + s * 16, cy + 3, 4, 2.5, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }

  drawCombo(g, t) {
    const L = this.L
    const cx = L.lx + L.lw / 2
    const j = this.judge
    if (j && t - j.t < 0.6) {
      const k = (t - j.t) / 0.6
      const st = JUDGE_STYLE[j.j]
      const sc = 1 + Math.max(0, 0.25 - k) * 1.6
      g.save()
      g.translate(cx, L.hitY - 90 - k * 10)
      g.scale(sc, sc)
      g.globalAlpha = 1 - k * k
      g.font = '34px Jua, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.lineWidth = 7
      g.strokeStyle = '#fff'
      g.strokeText(st.text, 0, 0)
      if (j.j === 'perfect') {
        const gr = g.createLinearGradient(-80, 0, 80, 0)
        ;['#ff7eb3', '#ffb04d', '#ffe27a', '#5fd08f', '#6d9dff', '#b07bff'].forEach((c, i) => gr.addColorStop(i / 5, c))
        g.fillStyle = gr
      } else g.fillStyle = st.color
      g.fillText(st.text, 0, 0)
      g.restore()
    }
    const c = this.stats.combo
    if (c >= 3) {
      const k = clamp((t - (this.comboBump || -9)) / 0.2, 0, 1)
      g.save()
      g.translate(cx, L.hitY - 170)
      const big = t - this.comboT < 0.5
      const sc = (big ? 1.5 : 1) * (1 + (1 - k) * 0.15)
      g.scale(sc, sc)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = '48px Jua, sans-serif'
      g.lineWidth = 8
      g.strokeStyle = 'rgba(255,255,255,0.95)'
      g.strokeText(String(c), 0, 0)
      g.fillStyle = this.scene.theme === 'space' ? '#7a5cff' : '#ff5c9a'
      g.fillText(String(c), 0, 0)
      g.font = '16px Jua, sans-serif'
      g.lineWidth = 5
      g.strokeText('COMBO', 0, 32)
      g.fillText('COMBO', 0, 32)
      g.restore()
    }
    if (this.lastShownCombo !== c) {
      this.lastShownCombo = c
      this.comboBump = t
    }
  }

  drawRace(g, t, now, dt) {
    const L = this.L
    const y0 = L.fieldBottom
    this.scroll = (this.scroll || 0) + dt * 60 * (1 + Math.min(this.stats.combo, 40) / 20)
    const trackTop = this.scene.drawTrack(g, 0, y0, L.w, L.trackH, now, this.scroll)
    const space = this.scene.theme === 'space'
    const rows = Math.max(this.runners.length, 2)
    const rowH = (L.h - trackTop - 6) / rows
    const x0 = 34
    const x1 = L.w - 40
    // 길
    for (let i = 0; i < rows; i++) {
      const y = trackTop + i * rowH
      g.fillStyle = space ? (i % 2 ? '#3a2a7a' : '#43308a') : i % 2 ? '#f2c79a' : '#f6d3ab'
      g.fillRect(0, y, L.w, rowH)
      g.strokeStyle = space ? 'rgba(255,240,150,0.35)' : 'rgba(255,255,255,0.7)'
      g.lineWidth = 2
      g.setLineDash([10, 10])
      g.lineDashOffset = this.scroll
      g.beginPath()
      g.moveTo(0, y + rowH)
      g.lineTo(L.w, y + rowH)
      g.stroke()
      g.setLineDash([])
    }
    // 결승선 깃발
    g.save()
    const fh = rows * rowH
    for (let k = 0; k < fh / 8; k++) {
      for (let m = 0; m < 2; m++) {
        g.fillStyle = (k + m) % 2 ? '#fff' : '#3a2a3a'
        g.fillRect(x1 + 8 + m * 8, trackTop + k * 8, 8, 8)
      }
    }
    g.restore()
    // 달리는 친구들
    const order = this.places()
    this.runners.forEach((r, i) => {
      const target = clamp(r.prog, 0, 1)
      const before = r.shown
      r.shown = lerp(r.shown, target, Math.min(1, dt * 4))
      const speed = (r.shown - before) / Math.max(dt, 0.001)
      r.phase += dt * (6 + speed * 600 + (r.combo || 0) * 0.15)
      const x = x0 + (x1 - x0) * r.shown
      const y = trackTop + i * rowH + rowH * 0.88
      const size = Math.min(rowH * 0.34, 20)
      const bounce = Math.abs(Math.sin(r.phase)) * size * 0.25
      g.fillStyle = 'rgba(40,20,60,0.18)'
      g.beginPath()
      g.ellipse(x, y + 1, size * 0.9, size * 0.25, 0, 0, Math.PI * 2)
      g.fill()
      // 콤보가 높으면 달리는 꼬리 효과
      if ((r.combo || 0) >= 10) {
        g.strokeStyle = space ? 'rgba(255,240,150,0.7)' : 'rgba(255,126,179,0.6)'
        g.lineWidth = 3
        for (let k = -1; k <= 1; k++) {
          g.beginPath()
          g.moveTo(x - size * 1.3, y - size + k * 6)
          g.lineTo(x - size * 1.3 - 14 - Math.min(r.combo, 40), y - size + k * 6)
          g.stroke()
        }
      }
      drawChar(g, r.char, x, y - bounce, size, { run: r.phase, mood: r.combo >= 10 ? 'happy' : 'idle', hat: r.hat, look: 1 })
      const place = order.indexOf(r) + 1
      g.font = '700 11px Jua, sans-serif'
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      const label = `${place}등 ${r.name}`
      const tw = g.measureText(label).width + 10
      const lx = clamp(x + size + 4, 2, L.w - tw - 30)
      g.fillStyle = r.me ? 'rgba(255,92,154,0.92)' : 'rgba(90,80,140,0.85)'
      this.round(g, lx, y - size * 1.6 - 8, tw, 16, 8)
      g.fill()
      g.fillStyle = '#fff'
      g.fillText(label, lx + 5, y - size * 1.6)
    })
  }

  drawIntro(g, t) {
    const L = this.L
    const firstT = this.notes[0]?.t ?? 0
    if (t > firstT) return
    const beats = (firstT - t) / this.chart.beatSec
    g.save()
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const cx = L.lx + L.lw / 2
    const cy = (L.top + L.hitY) / 2
    if (beats > 3.5 || t < 0) {
      g.font = '30px Jua, sans-serif'
      g.lineWidth = 7
      g.strokeStyle = '#fff'
      g.fillStyle = '#ff5c9a'
      g.strokeText('♪ ' + this.song.title, cx, cy - 20)
      g.fillText('♪ ' + this.song.title, cx, cy - 20)
      g.font = '18px Jua, sans-serif'
      g.lineWidth = 5
      g.fillStyle = '#7a5c8a'
      g.strokeText('건반이 선에 닿을 때 톡!', cx, cy + 20)
      g.fillText('건반이 선에 닿을 때 톡!', cx, cy + 20)
    } else {
      const n = Math.ceil(beats)
      g.font = `${Math.round(L.lw * 0.3)}px Jua, sans-serif`
      g.lineWidth = 10
      g.strokeStyle = '#fff'
      g.fillStyle = '#ff5c9a'
      g.globalAlpha = 0.85
      g.strokeText(n > 0 ? String(n) : '', cx, cy)
      g.fillText(n > 0 ? String(n) : '', cx, cy)
    }
    g.restore()
  }

  round(g, x, y, w, h, r) {
    r = Math.min(r, Math.abs(h) / 2, w / 2)
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }
}
