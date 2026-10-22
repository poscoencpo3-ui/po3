// 게임 화면: 슬라임 구름 점프 + 괴물 + 지름길 + 친구들
import { cloudAt, cloudOffset } from './map.js'
import { planMonster, monsterAt } from './monster.js'
import { drawChar } from './chars.js'
import { sfx } from './audio.js'
import { lerp, clamp, dist, easeOut } from './rng.js'

const PR = 26 // 캐릭터 몸 크기
const LADDER_CLIMB = 300 // 사다리 오르는 속도 px/s
const LADDER_SLIDE = 700 // 미끄럼틀 속도
const LADDER_FLY = 0.75 // 날아가는 시간
const RECOVER = 0.15 // 착지 후 다시 뛸 수 있기까지
const COLORS = ['#ff9ec7', '#9be3c4', '#c7b3ff', '#9fd4ff', '#ffe27a', '#ffc49b']

function pathLen(pts) {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
  return s
}

function pathAt(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const l = dist(ax, ay, bx, by)
    if (d <= l || i === pts.length - 1) {
      const p = clamp(d / l, 0, 1)
      return [lerp(ax, bx, p), lerp(ay, by, p)]
    }
    d -= l
  }
  return pts[pts.length - 1]
}

// 사다리 → 미끄럼틀 → 휙 날아가기. 경과 시간으로 위치를 계산(친구 화면에서도 같게)
export function ladderPlan(map) {
  const L = map.ladder
  const climb = pathLen(L.climb) / LADDER_CLIMB
  const slide = pathLen(L.slide) / LADDER_SLIDE
  return { climb, slide, total: climb + slide + LADDER_FLY }
}

function ladderPos(map, plan, e) {
  const L = map.ladder
  if (e < plan.climb) {
    const [x, y] = pathAt(L.climb, e * LADDER_CLIMB)
    return { x, y, z: Math.abs(Math.sin(e * 18)) * 4, phase: 'climb', step: Math.floor(e * 9) }
  }
  e -= plan.climb
  if (e < plan.slide) {
    const [x, y] = pathAt(L.slide, e * LADDER_SLIDE)
    return { x, y, z: 0, phase: 'slide' }
  }
  e -= plan.slide
  const p = clamp(e / LADDER_FLY, 0, 1)
  const [sx, sy] = L.slide[L.slide.length - 1]
  const [tx, ty] = L.land
  return { x: lerp(sx, tx, p), y: lerp(sy, ty, p), z: Math.sin(p * Math.PI) * 170, phase: 'fly', p }
}

export class Game {
  constructor(canvas, { map, me, seed, others = [], onWin, onSend, onToast }) {
    this.cv = canvas
    this.g = canvas.getContext('2d')
    this.map = map
    this.onWin = onWin || (() => {})
    this.onSend = onSend || (() => {})
    this.onToast = onToast || (() => {})
    this.maxJump = Math.round(map.width * 0.2)
    this.segs = planMonster(map, seed)
    this.ladder = ladderPlan(map)
    this.parts = []
    this.marks = []
    this.shake = 0
    this.startAt = Infinity
    this.lastCount = 4
    this.mon = { eatT: -9, lastSeg: null }
    this.cloudJig = new Map()
    this.me = this.makePlayer(me, 0)
    this.me.local = true
    this.players = new Map([[me.id, this.me]])
    others.forEach((o, i) => this.players.set(o.id, this.makePlayer(o, i + 1)))
    this.lastBeat = 0
    this.running = true
    this.resize = this.resize.bind(this)
    this.onPointer = this.onPointer.bind(this)
    window.addEventListener('resize', this.resize)
    canvas.addEventListener('pointerdown', this.onPointer)
    this.resize()
    const loop = () => {
      if (!this.running) return
      this.frame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    this.running = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.cv.removeEventListener('pointerdown', this.onPointer)
  }

  makePlayer(info, slot) {
    const s = this.map.start
    const ox = s.cx - s.x + ((slot % 3) - 1) * 20
    const oy = s.cy - s.y + (slot >= 3 ? 14 : 0) + ((slot % 2) * 8 - 4)
    return {
      id: info.id,
      name: info.name,
      char: info.char,
      state: 'stand',
      cloud: s,
      ox,
      oy,
      x: s.x + ox,
      y: s.y + oy,
      z: 0,
      t0: 0,
      safe: { cloud: s, ox, oy },
      invuln: 0,
      blink: Math.random() * 4,
      look: 0,
      landT: -9,
    }
  }

  // 출발 시각(초, performance.now 기준)
  begin(startAt) {
    this.startAt = startAt
  }

  get t() {
    return performance.now() / 1000 - this.startAt
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const w = this.cv.clientWidth
    const h = this.cv.clientHeight
    this.cv.width = Math.round(w * dpr)
    this.cv.height = Math.round(h * dpr)
    this.dpr = dpr
    const top = 58
    const bottom = 10
    const s = Math.min(w / this.map.width, (h - top - bottom) / this.map.height)
    this.view = { s, x: (w - this.map.width * s) / 2, y: top + (h - top - bottom - this.map.height * s) / 2, w, h }
  }

  toWorld(px, py) {
    const v = this.view
    return [(px - v.x) / v.s, (py - v.y) / v.s]
  }

  onPointer(e) {
    e.preventDefault()
    const r = this.cv.getBoundingClientRect()
    const [x, y] = this.toWorld(e.clientX - r.left, e.clientY - r.top)
    this.tap(x, y)
  }

  // ---------------- 내 캐릭터 ----------------
  tap(x, y) {
    const p = this.me
    const t = this.t
    if (t < 0 || p.done) return
    // 착지 직전·직후에 누른 것은 잠깐 기억했다가 바로 뜀
    const soon = p.state === 'jump' && p.t0 + p.jump.dur - t < 0.2
    if (soon || (p.state === 'stand' && t - p.landT < RECOVER)) {
      p.pending = { x, y, t }
      return
    }
    if (p.state !== 'stand') return
    p.pending = null
    let d = dist(p.x, p.y, x, y)
    if (d > this.maxJump) {
      x = p.x + ((x - p.x) / d) * this.maxJump
      y = p.y + ((y - p.y) / d) * this.maxJump
      d = this.maxJump
    }
    const k = d / this.maxJump
    const jump = { x0: p.x, y0: p.y, x1: x, y1: y, dur: 0.38 + 0.3 * k, h: 34 + 86 * k }
    this.startJump(p, jump, t)
    this.marks.push({ x, y, t })
    sfx.jump()
    this.onSend('j', jump)
  }

  startJump(p, jump, t) {
    p.state = 'jump'
    p.jump = jump
    p.t0 = t
    p.look = Math.sign(jump.x1 - jump.x0)
  }

  land(p, t) {
    const L = this.map.ladder
    if (dist(p.x, p.y, L.entry[0], L.entry[1]) < 46) {
      p.state = 'ladder'
      p.t0 = t
      p.step = -1
      if (p.local) {
        this.onToast('지름길! 🪜')
        this.onSend('f', { k: 'ladder' })
      }
      return
    }
    const c = cloudAt(this.map, p.x, p.y, t)
    if (!c) {
      p.state = 'fall'
      p.t0 = t
      if (p.local) {
        sfx.fall()
        this.onSend('f', { k: 'fall', x: p.x, y: p.y })
      }
      return
    }
    const [dx, dy] = cloudOffset(c, t)
    p.state = 'stand'
    p.cloud = c
    p.ox = p.x - c.x - dx
    p.oy = p.y - c.y - dy
    p.landT = t
    this.cloudJig.set(c.id, t)
    this.puff(p.x, p.y, 6)
    if (p.local) {
      sfx.land()
      p.safe = { cloud: c, ox: p.ox, oy: p.oy }
      this.onSend('p', { c: c.id, ox: p.ox, oy: p.oy })
      if (c.role === 'goal' && !p.done) this.win(p, t)
    }
  }

  win(p, t) {
    p.done = true
    p.state = 'win'
    p.finishT = t
    sfx.win()
    this.confetti(this.map.door[0], this.map.door[1])
    this.onSend('w', { time: t })
    this.onWin(t)
  }

  respawn(p, t, toStart) {
    const s = toStart ? { cloud: this.map.start, ox: p.safe.ox, oy: p.safe.oy } : p.safe
    if (toStart) {
      const st = this.map.start
      s.ox = st.cx - st.x + (Math.random() * 30 - 15)
      s.oy = st.cy - st.y + (Math.random() * 16 - 8)
      p.safe = s
    }
    p.cloud = s.cloud
    p.ox = s.ox
    p.oy = s.oy
    p.state = 'stand'
    p.invuln = t + (toStart ? 2.2 : 1.3)
    this.onSend('p', { c: p.cloud.id, ox: p.ox, oy: p.oy, inv: p.invuln - t })
  }

  updatePlayer(p, t) {
    if (p.state === 'stand' || p.state === 'win') {
      const c = p.cloud
      const [dx, dy] = cloudOffset(c, t)
      p.x = c.x + dx + p.ox
      p.y = c.y + dy + p.oy
      p.z = p.state === 'win' ? Math.abs(Math.sin(t * 6)) * 18 : 0
      if (p.local && p.pending && t - p.landT >= RECOVER) {
        const q = p.pending
        p.pending = null
        if (t - q.t < 0.45) this.tap(q.x, q.y)
      }
    } else if (p.state === 'jump') {
      const j = p.jump
      const k = clamp((t - p.t0) / j.dur, 0, 1)
      p.x = lerp(j.x0, j.x1, k)
      p.y = lerp(j.y0, j.y1, k)
      p.z = Math.sin(k * Math.PI) * j.h
      if (k >= 1) {
        p.z = 0
        if (p.local) this.land(p, t)
        else p.state = 'wait'
      }
    } else if (p.state === 'ladder') {
      const e = t - p.t0
      const lp = ladderPos(this.map, this.ladder, e)
      p.x = lp.x
      p.y = lp.y
      p.z = lp.z
      p.lphase = lp.phase
      if (p.local) {
        if (lp.phase === 'climb' && lp.step !== p.step) {
          p.step = lp.step
          sfx.ladderStep(lp.step)
        }
        if (lp.phase === 'slide' && !p.slid) {
          p.slid = true
          sfx.slide()
        }
      }
      if (lp.phase === 'slide' && Math.random() < 0.5) this.spark(p.x, p.y, 1)
      if (e >= this.ladder.total) {
        p.slid = false
        p.x = this.map.ladder.land[0]
        p.y = this.map.ladder.land[1]
        p.z = 0
        if (p.local) this.land(p, t)
        else p.state = 'wait'
      }
    } else if (p.state === 'fall') {
      if (p.local && t - p.t0 > 1.0) this.respawn(p, t, false)
    } else if (p.state === 'eaten') {
      if (p.local && t - p.t0 > 1.7) this.respawn(p, t, true)
    }
  }

  // ---------------- 괴물 ----------------
  monsterR() {
    const m = this.map.monster
    return Math.min(m.w, m.h) * 0.36 * m.scale
  }

  updateMonster(t) {
    const m = monsterAt(this.segs, Math.max(0, t))
    const s = m.seg
    if (s !== this.mon.lastSeg && t > 0) {
      const near = clamp(1 - dist(m.x, m.y, this.me.x, this.me.y) / 700, 0.15, 1)
      if (s.type === 'air') sfx.monsterHop(0.3 * near)
      if (s.type === 'crouch' && s.big) sfx.monsterGrowl()
      if (s.type === 'rest' && s.land) {
        this.splat(m.x, m.y, s.big ? 14 : 6)
        if (s.big) {
          this.shake = 0.45
          sfx.monsterThud(0.6 * near)
        } else sfx.monsterThud(0.25 * near)
        const c = cloudAt(this.map, m.x, m.y, t, 30)
        if (c) this.cloudJig.set(c.id, t)
      }
      this.mon.lastSeg = s
    }
    this.mon.now = m
    const p = this.me
    if (t <= 0 || p.done || t < p.invuln) return
    const vulnerable = p.state === 'stand' || p.state === 'ladder' || (p.state === 'jump' && p.z < 14)
    if (vulnerable && m.z < 30 && dist(p.x, p.y, m.x, m.y + 10) < this.monsterR() + PR * 0.7) {
      p.state = 'eaten'
      p.t0 = t
      p.eatX = m.x
      p.eatY = m.y
      this.mon.eatT = t
      this.shake = 0.3
      sfx.eaten()
      this.onToast('냠! 괴물에게 먹혔어요 😵 처음부터!')
      this.onSend('f', { k: 'eaten', x: m.x, y: m.y })
    }
  }

  // ---------------- 친구 ----------------
  addOther(o) {
    if (!this.players.has(o.id)) this.players.set(o.id, this.makePlayer(o, this.players.size))
  }

  removeOther(id) {
    if (id !== this.me.id) this.players.delete(id)
  }

  remote(id, type, d) {
    const p = this.players.get(id)
    if (!p || p.local) return
    const t = this.t
    if (type === 'j') this.startJump(p, d, t)
    else if (type === 'p') {
      const c = this.map.clouds[d.c]
      if (!c) return
      if (p.state !== 'stand' && p.state !== 'win') this.cloudJig.set(c.id, t)
      p.cloud = c
      p.ox = d.ox
      p.oy = d.oy
      if (p.state !== 'win') p.state = 'stand'
      if (d.inv) p.invuln = t + d.inv
    } else if (type === 'f') {
      if (d.k === 'ladder') {
        p.state = 'ladder'
        p.t0 = t
      } else {
        p.state = d.k
        p.t0 = t
        if (d.k === 'eaten') {
          p.eatX = d.x
          p.eatY = d.y
          this.mon.eatT = t
        }
        if (d.k === 'fall') {
          p.x = d.x
          p.y = d.y
        }
      }
    } else if (type === 'w') {
      p.done = true
      p.state = 'win'
      p.cloud = this.map.goal
      p.ox = this.map.goal.cx - this.map.goal.x + (Math.random() * 30 - 15)
      p.oy = this.map.goal.cy - this.map.goal.y
      this.confetti(this.map.door[0], this.map.door[1])
      sfx.chime()
    }
  }

  // ---------------- 효과 ----------------
  puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      this.parts.push({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 25, life: 0.45, max: 0.45, r: 7 + Math.random() * 5, c: 'rgba(255,255,255,0.9)', k: 'puff' })
    }
  }

  splat(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 80 + Math.random() * 160
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, life: 0.6, max: 0.6, r: 5 + Math.random() * 7, c: 'rgba(120,220,120,0.8)', k: 'puff' })
    }
  }

  spark(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: x + Math.random() * 20 - 10, y, vx: Math.random() * 40 - 20, vy: -40 - Math.random() * 40, life: 0.5, max: 0.5, r: 5, c: '#fff6a8', k: 'star' })
    }
  }

  confetti(x, y) {
    for (let i = 0; i < 40; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      const v = 200 + Math.random() * 260
      this.parts.push({ x, y: y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 420, life: 1.6, max: 1.6, r: 6, c: COLORS[i % COLORS.length], k: 'conf', rot: Math.random() * 6 })
    }
  }

  // ---------------- 매 프레임 ----------------
  frame() {
    const now = performance.now() / 1000
    const dt = Math.min(0.05, now - (this.prev || now))
    this.prev = now
    const t = this.t
    if (t < 0) {
      const n = Math.ceil(-t)
      if (n < this.lastCount && n <= 3) {
        this.lastCount = n
        sfx.beep(false)
      }
    } else if (this.lastCount > 0) {
      this.lastCount = 0
      sfx.beep(true)
    }
    if (this.me.state === 'stand' && t - this.lastBeat > 1 && t > 0) {
      this.lastBeat = t
      this.onSend('p', { c: this.me.cloud.id, ox: this.me.ox, oy: this.me.oy, hb: 1 })
    }
    for (const p of this.players.values()) this.updatePlayer(p, t)
    this.updateMonster(t)
    for (const q of this.parts) {
      q.life -= dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      if (q.g) q.vy += q.g * dt
      else {
        q.vx *= 0.92
        q.vy *= 0.92
      }
    }
    this.parts = this.parts.filter((q) => q.life > 0)
    this.marks = this.marks.filter((m) => t - m.t < 0.5)
    this.shake = Math.max(0, this.shake - dt)
    this.draw(t, now)
  }

  draw(t, now) {
    const g = this.g
    const v = this.view
    const dpr = this.dpr
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const grd = g.createLinearGradient(0, 0, 0, v.h)
    grd.addColorStop(0, '#dcf2ff')
    grd.addColorStop(1, '#ffe8f3')
    g.fillStyle = grd
    g.fillRect(0, 0, v.w, v.h)

    const sh = this.shake > 0 ? this.shake * 16 : 0
    const sx = sh ? (Math.random() - 0.5) * sh : 0
    const sy = sh ? (Math.random() - 0.5) * sh : 0
    g.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * (v.x + sx), dpr * (v.y + sy))
    const map = this.map
    g.drawImage(map.bgImg, 0, 0, map.width, map.height)

    this.drawLadderHint(g, t, now)
    const occupied = new Set()
    for (const p of this.players.values()) if (p.state === 'stand' || p.state === 'win') occupied.add(p.cloud.id)
    const m = this.mon.now
    const monCloud = m && m.z < 30 ? cloudAt(map, m.x, m.y, t, 25) : null
    for (const c of map.clouds) {
      const [dx, dy] = cloudOffset(c, t)
      g.drawImage(c.shadow, c.x + dx + 7, c.y + dy + 12)
    }
    for (const c of map.clouds) this.drawCloud(g, c, t, occupied.has(c.id), monCloud === c)
    this.drawDoor(g, t, now)

    // 내 점프 범위
    const me = this.me
    if (me.state === 'stand' && t > -3 && !me.done) {
      g.save()
      g.setLineDash([10, 12])
      g.lineDashOffset = -now * 30
      g.strokeStyle = 'rgba(255,255,255,0.75)'
      g.lineWidth = 4
      g.beginPath()
      g.arc(me.x, me.y, this.maxJump, 0, Math.PI * 2)
      g.stroke()
      g.restore()
    }
    for (const mk of this.marks) {
      const k = (t - mk.t) / 0.5
      g.strokeStyle = `rgba(255,120,170,${1 - k})`
      g.lineWidth = 5
      g.beginPath()
      g.arc(mk.x, mk.y, 12 + k * 26, 0, Math.PI * 2)
      g.stroke()
    }

    // 그림자 + 캐릭터/괴물 (아래쪽이 앞에)
    const list = []
    for (const p of this.players.values()) list.push({ y: p.y, p })
    const footY = m ? m.y + map.monster.h * map.monster.scale * 0.42 : 0
    if (m) list.push({ y: footY + (m.z > 30 ? 9999 : 0), m })
    list.sort((a, b) => a.y - b.y)
    for (const p of this.players.values()) this.drawShadow(g, p.x, p.y, PR * 0.9, p.z, p.state)
    if (m) this.drawShadow(g, m.x, footY, this.monsterR() * 1.1, m.z, 'mon')
    for (const it of list) {
      if (it.m) this.drawMonster(g, it.m, t, now)
      else this.drawPlayer(g, it.p, t, now)
    }
    for (const q of this.parts) {
      const a = clamp(q.life / q.max, 0, 1)
      g.globalAlpha = a
      g.fillStyle = q.c
      if (q.k === 'conf') {
        g.save()
        g.translate(q.x, q.y)
        g.rotate(q.rot + q.life * 8)
        g.fillRect(-q.r, -q.r / 2, q.r * 2, q.r)
        g.restore()
      } else if (q.k === 'star') {
        this.star(g, q.x, q.y, q.r * (0.5 + a))
      } else {
        g.beginPath()
        g.arc(q.x, q.y, q.r * (1.4 - a * 0.4), 0, Math.PI * 2)
        g.fill()
      }
    }
    g.globalAlpha = 1

    // 이름표 (화면 크기 기준 글씨)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.textAlign = 'center'
    g.font = '700 12px Jua, sans-serif'
    for (const p of this.players.values()) {
      if (p.state === 'eaten' && t - p.t0 > 0.5) continue
      const x = v.x + p.x * v.s
      const y = v.y + (p.y - p.z - PR * 2.6) * v.s - 8
      const w = g.measureText(p.name).width + 12
      g.fillStyle = p.local ? 'rgba(255,105,160,0.92)' : 'rgba(90,90,140,0.78)'
      this.round(g, x - w / 2, y - 14, w, 18, 9)
      g.fill()
      g.fillStyle = '#fff'
      g.fillText(p.name, x, y)
    }
    if (t < 0 && t > -3.5) this.bigText(g, String(Math.ceil(-t)), v)
    else if (t >= 0 && t < 0.8) this.bigText(g, '출발!', v)
  }

  bigText(g, s, v) {
    g.save()
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `${Math.round(Math.min(v.w, v.h) * 0.22)}px Jua, sans-serif`
    g.lineWidth = 10
    g.strokeStyle = '#fff'
    g.strokeText(s, v.w / 2, v.h / 2)
    g.fillStyle = '#ff5c9a'
    g.fillText(s, v.w / 2, v.h / 2)
    g.restore()
  }

  round(g, x, y, w, h, r) {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }

  star(g, x, y, r) {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.45 : r
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
  }

  drawShadow(g, x, y, r, z, state) {
    if (state === 'fall' || state === 'eaten' || state === 'wait') return
    const k = 1 / (1 + z / 120)
    g.fillStyle = `rgba(60,40,110,${0.22 * k})`
    g.beginPath()
    g.ellipse(x, y + 2, r * k, r * 0.4 * k, 0, 0, Math.PI * 2)
    g.fill()
  }

  drawCloud(g, c, t, occupied, scared) {
    const [dx, dy] = cloudOffset(c, t)
    const jt = this.cloudJig.get(c.id)
    let j = 0
    if (jt !== undefined && t - jt < 1.2) j = Math.exp(-(t - jt) * 4.5) * Math.sin((t - jt) * 26) * 0.13
    const bx = c.x + dx + c.w / 2
    const by = c.y + dy + c.h
    g.save()
    g.translate(bx, by)
    g.scale(1 + j, 1 - j)
    g.drawImage(c.image, -c.w / 2, -c.h)
    // 슬라임 얼굴
    if (c.face) {
      const f = clamp(Math.min(c.w, c.h) * 0.08, 5, 13)
      const fx = c.cx - c.x - c.w / 2
      const fy = c.cy - c.y - c.h + f * 0.5
      g.strokeStyle = 'rgba(70,45,60,0.85)'
      g.fillStyle = 'rgba(70,45,60,0.9)'
      g.lineWidth = f * 0.32
      g.lineCap = 'round'
      for (const s of [-1, 1]) {
        const ex = fx + s * f * 1.15
        g.beginPath()
        if (scared) {
          g.moveTo(ex - s * f * 0.45, fy - f * 0.45)
          g.lineTo(ex + s * f * 0.35, fy)
          g.lineTo(ex - s * f * 0.45, fy + f * 0.45)
          g.stroke()
        } else if (occupied) {
          g.ellipse(ex, fy, f * 0.32, f * 0.42, 0, 0, Math.PI * 2)
          g.fill()
        } else {
          g.arc(ex, fy - f * 0.1, f * 0.42, 0.15 * Math.PI, 0.85 * Math.PI)
          g.stroke()
        }
      }
      g.fillStyle = 'rgba(255,120,150,0.45)'
      for (const s of [-1, 1]) {
        g.beginPath()
        g.ellipse(fx + s * f * 2.1, fy + f * 0.55, f * 0.5, f * 0.3, 0, 0, Math.PI * 2)
        g.fill()
      }
      g.beginPath()
      if (scared) {
        g.ellipse(fx, fy + f * 0.85, f * 0.3, f * 0.38, 0, 0, Math.PI * 2)
        g.fillStyle = 'rgba(70,45,60,0.9)'
        g.fill()
      } else {
        g.arc(fx, fy + f * 0.35, f * (occupied ? 0.45 : 0.3), 0.15 * Math.PI, 0.85 * Math.PI)
        g.stroke()
      }
    }
    g.restore()
  }

  drawLadderHint(g, t, now) {
    const [x, y] = this.map.ladder.entry
    const b = Math.abs(Math.sin(now * 4)) * 10
    g.save()
    g.fillStyle = 'rgba(255,240,120,0.35)'
    g.beginPath()
    g.ellipse(x, y, 40 + Math.sin(now * 3) * 4, 22, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ff7eb3'
    g.strokeStyle = '#fff'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(x, y - 18 - b)
    g.lineTo(x - 14, y - 40 - b)
    g.lineTo(x - 6, y - 40 - b)
    g.lineTo(x - 6, y - 56 - b)
    g.lineTo(x + 6, y - 56 - b)
    g.lineTo(x + 6, y - 40 - b)
    g.lineTo(x + 14, y - 40 - b)
    g.closePath()
    g.stroke()
    g.fill()
    g.font = '26px Jua, sans-serif'
    g.textAlign = 'center'
    g.lineWidth = 6
    g.strokeText('지름길', x, y - 66 - b)
    g.fillText('지름길', x, y - 66 - b)
    g.restore()
  }

  drawDoor(g, t, now) {
    const [x, y] = this.map.door
    const done = this.me.done
    g.save()
    // 반짝이는 빛
    const glow = g.createRadialGradient(x, y - 30, 5, x, y - 30, 90)
    glow.addColorStop(0, 'rgba(255,240,150,0.65)')
    glow.addColorStop(1, 'rgba(255,240,150,0)')
    g.fillStyle = glow
    g.beginPath()
    g.arc(x, y - 30, 90 + Math.sin(now * 3) * 6, 0, Math.PI * 2)
    g.fill()
    if (this.map.id === 'saebom') {
      // 새봄이 맵의 도착 구름에 귀여운 문
      const w = 46
      const h = 62
      const top = y - h + 6
      g.fillStyle = done ? '#5a3d6b' : '#ff9ec7'
      g.strokeStyle = '#6b3b52'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(x - w / 2, y + 6)
      g.lineTo(x - w / 2, top + w / 2)
      g.arc(x, top + w / 2, w / 2, Math.PI, 0)
      g.lineTo(x + w / 2, y + 6)
      g.closePath()
      g.fill()
      g.stroke()
      if (done) {
        g.fillStyle = '#ffb3d1'
        g.beginPath()
        g.moveTo(x + w / 2, y + 6)
        g.lineTo(x + w / 2 + 16, y)
        g.lineTo(x + w / 2 + 16, top + 10)
        g.lineTo(x + w / 2, top + w / 2)
        g.closePath()
        g.fill()
        g.stroke()
      } else {
        g.fillStyle = '#ffe27a'
        this.star(g, x, top + 22, 10)
        g.beginPath()
        g.arc(x + 13, y - 18, 4, 0, Math.PI * 2)
        g.fill()
      }
    }
    // 깃발 글씨
    const b = Math.sin(now * 4) * 5
    g.font = '30px Jua, sans-serif'
    g.textAlign = 'center'
    g.lineWidth = 7
    g.strokeStyle = '#fff'
    g.fillStyle = '#ff5c9a'
    const ty = this.map.id === 'saebom' ? y - 74 + b : y - 60 + b
    g.strokeText('도착!', x, ty)
    g.fillText('도착!', x, ty)
    g.restore()
  }

  drawPlayer(g, p, t, now) {
    let mood = 'idle'
    let sx = 1
    let sy = 1
    let rot = 0
    let alpha = 1
    let x = p.x
    let y = p.y - p.z
    let r = PR
    if (p.state === 'jump') {
      const k = (t - p.t0) / p.jump.dur
      mood = 'jump'
      sx = k < 0.15 ? 1.15 : 0.9
      sy = k < 0.15 ? 0.85 : 1.12
    } else if (p.state === 'stand') {
      const k = t - p.landT
      if (k < 0.3) {
        const s = Math.sin((k / 0.3) * Math.PI) * 0.25
        sx = 1 + s
        sy = 1 - s
      } else {
        sy = 1 + Math.sin(now * 5 + p.blink) * 0.03
      }
    } else if (p.state === 'fall') {
      const k = clamp((t - p.t0) / 1.0, 0, 1)
      mood = 'scared'
      r = PR * (1 - k * 0.85)
      rot = k * 8
      y += k * 40
      alpha = 1 - k * 0.6
    } else if (p.state === 'eaten') {
      const k = clamp((t - p.t0) / 0.5, 0, 1)
      mood = 'scared'
      x = lerp(p.x, p.eatX, easeOut(k))
      y = lerp(p.y, p.eatY + 20, easeOut(k))
      r = PR * (1 - k * 0.9)
      if (k >= 1) {
        // 먹힌 뒤 머리 위 빙글빙글 별
        g.fillStyle = '#ffe27a'
        for (let i = 0; i < 3; i++) {
          const a = now * 5 + (i * Math.PI * 2) / 3
          this.star(g, p.eatX + Math.cos(a) * 40, p.eatY - 70 + Math.sin(a) * 12, 10)
        }
        return
      }
    } else if (p.state === 'ladder') {
      mood = p.lphase === 'climb' ? 'idle' : 'happy'
      if (p.lphase === 'fly') rot = Math.sin(now * 20) * 0.2
    } else if (p.state === 'win') {
      mood = 'happy'
    } else if (p.state === 'wait') {
      alpha = 0.7
    }
    if (t < p.invuln && Math.floor(now * 10) % 2 === 0) alpha *= 0.35
    const blink = (now + p.blink) % 3.2 < 0.12
    g.globalAlpha = alpha
    drawChar(g, p.char, x, y, r, { sx, sy, rot, mood, blink, look: p.look || 0 })
    g.globalAlpha = 1
  }

  drawMonster(g, m, t, now) {
    const mm = this.map.monster
    const s = m.seg
    let sx = 1
    let sy = 1
    let shakeX = 0
    if (s.type === 'crouch') {
      const k = Math.sin(m.p * Math.PI * 0.5)
      const d = s.big ? 0.3 : 0.16
      sx = 1 + d * k
      sy = 1 - d * k
      if (s.big) shakeX = Math.sin(now * 60) * 4
    } else if (s.type === 'air') {
      sx = 0.88
      sy = 1.14
    } else {
      const e = t - s.t0
      const w = s.land ? Math.exp(-e * 4) * Math.sin(e * 22) * (s.big ? 0.25 : 0.14) : 0
      sx = 1 + w + Math.sin(now * 2.5) * 0.02
      sy = 1 - w - Math.sin(now * 2.5) * 0.02
    }
    const sc = mm.scale
    const x = m.x + shakeX
    const y = m.y - m.z
    g.save()
    g.translate(x, y + (mm.h * sc) / 2)
    g.scale(sc * sx, sc * sy)
    g.translate(-mm.w / 2, -mm.h)
    g.drawImage(mm.image, 0, 0)
    // 눈: 내 캐릭터를 쳐다봄
    const me = this.me
    const ang = Math.atan2(me.y - m.y, me.x - m.x)
    const blink = now % 4.3 < 0.13
    const angry = s.type === 'crouch' || this.mon.eatT > t - 0.9
    for (const e of mm.eyes) {
      g.fillStyle = '#fff'
      g.strokeStyle = '#3d3540'
      g.lineWidth = 5
      if (blink) {
        g.beginPath()
        g.moveTo(e.x - e.r, e.y)
        g.lineTo(e.x + e.r, e.y)
        g.stroke()
        continue
      }
      g.beginPath()
      g.arc(e.x, e.y, e.r, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.fillStyle = '#2b2230'
      g.beginPath()
      g.arc(e.x + Math.cos(ang) * e.r * 0.4, e.y + Math.sin(ang) * e.r * 0.4, e.r * 0.42, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fff'
      g.beginPath()
      g.arc(e.x + Math.cos(ang) * e.r * 0.4 - e.r * 0.12, e.y + Math.sin(ang) * e.r * 0.4 - e.r * 0.14, e.r * 0.13, 0, Math.PI * 2)
      g.fill()
      if (angry) {
        g.strokeStyle = '#3d3540'
        g.lineWidth = 7
        g.beginPath()
        const inner = e === mm.eyes[0] ? 1 : -1
        g.moveTo(e.x - e.r * 1.0 * inner, e.y - e.r * 1.45)
        g.lineTo(e.x + e.r * 0.9 * inner, e.y - e.r * 1.05)
        g.stroke()
      }
    }
    // 입
    const ex = (mm.eyes[0].x + mm.eyes[mm.eyes.length - 1].x) / 2
    const ey = Math.max(...mm.eyes.map((e) => e.y)) + 70
    const eating = this.mon.eatT > t - 0.9
    g.fillStyle = '#7a2848'
    g.strokeStyle = '#3d3540'
    g.lineWidth = 6
    g.beginPath()
    if (eating) {
      const o = 30 + Math.abs(Math.sin((t - this.mon.eatT) * 14)) * 20
      g.ellipse(ex, ey, 42, o, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else if (s.type === 'crouch' && s.big) {
      g.ellipse(ex, ey, 30, 24, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else {
      g.moveTo(ex - 30, ey - 6)
      g.quadraticCurveTo(ex - 15, ey + 10, ex, ey - 2)
      g.quadraticCurveTo(ex + 15, ey + 10, ex + 30, ey - 6)
      g.stroke()
    }
    g.restore()
    if (s.type === 'crouch' && s.big) {
      g.save()
      g.font = '64px Jua, sans-serif'
      g.textAlign = 'center'
      g.fillStyle = '#ff4d6d'
      g.strokeStyle = '#fff'
      g.lineWidth = 8
      const yy = y - mm.h * sc * 0.55 - 20 - Math.sin(now * 20) * 4
      g.strokeText('!', x, yy)
      g.fillText('!', x, yy)
      g.restore()
    }
  }
}
