// 게임 화면: 날개로 파닥파닥 날아 슬라임 구름을 건너 문까지!
import { cloudAt, cloudOffset } from './map.js'
import { planMonster, monsterAt } from './monster.js'
import { drawChar } from './chars.js'
import { sfx } from './audio.js'
import { Scenery, star } from './background.js'
import { rng, lerp, clamp, dist, easeOut } from './rng.js'

const PR = 34 // 캐릭터 몸 크기
const HIT = 18 // 괴물에 닿는 거리 (그림보다 조금 작게, 아이들에게 너그럽게)
const ZOOM = 1.75 // 가까이 보기 배율
const FLAP_V = 330 // 날개짓 한 번에 위로 솟는 힘
const GRAV = 780
const SPEED = 290 // 나는 속도
const MAX_Z = 170
export const MAX_FLAPS = 3 // 한 번 날 때 날개짓 횟수
const CLIMB = 300
const SLIDE = 700
const LADDER_FLY = 0.75
const COLORS = ['#ff9ec7', '#9be3c4', '#c7b3ff', '#9fd4ff', '#ffe27a', '#ffc49b']
const MON_SIZES = [0.5, 0.34, 0.42, 0.3]

export const ITEMS = {
  shield: { emoji: '🛡️', name: '방패', dur: 8 },
  wings: { emoji: '🪶', name: '무한 날개', dur: 6 },
  freeze: { emoji: '❄️', name: '꽁꽁 얼음', dur: 5 },
  magnet: { emoji: '🧲', name: '별 자석', dur: 8 },
  speed: { emoji: '⚡', name: '번개 날개', dur: 5 },
  sticky: { emoji: '🍯', name: '끈끈이', dur: 0 },
}

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

// 지름길 타기: 경과 시간만으로 위치가 정해져서 친구 화면에서도 똑같이 보임
function rideInfo(sc) {
  if (sc.type === 'ladder') {
    const climb = pathLen(sc.climb) / CLIMB
    const slide = pathLen(sc.slide) / SLIDE
    return { climb, slide, total: climb + slide + LADDER_FLY, end: sc.land, entry: sc.entry }
  }
  if (sc.type === 'portal') return { total: 0.9, end: sc.b, entry: sc.a }
  return { total: 1.15, end: sc.land, entry: sc.at }
}

function ridePos(sc, info, e) {
  if (sc.type === 'ladder') {
    if (e < info.climb) {
      const [x, y] = pathAt(sc.climb, e * CLIMB)
      return { x, y, z: Math.abs(Math.sin(e * 18)) * 4, phase: 'climb', step: Math.floor(e * 9) }
    }
    e -= info.climb
    if (e < info.slide) {
      const [x, y] = pathAt(sc.slide, e * SLIDE)
      return { x, y, z: 0, phase: 'slide' }
    }
    e -= info.slide
    const p = clamp(e / LADDER_FLY, 0, 1)
    const [sx, sy] = sc.slide[sc.slide.length - 1]
    return { x: lerp(sx, sc.land[0], p), y: lerp(sy, sc.land[1], p), z: Math.sin(p * Math.PI) * 170, phase: 'fly' }
  }
  if (sc.type === 'portal') {
    if (e < 0.45) return { x: sc.a[0], y: sc.a[1], z: 0, phase: 'in', p: e / 0.45 }
    return { x: sc.b[0], y: sc.b[1], z: 0, phase: 'out', p: (e - 0.45) / 0.45 }
  }
  const p = clamp(e / 1.15, 0, 1)
  return { x: lerp(sc.at[0], sc.land[0], p), y: lerp(sc.at[1], sc.land[1], p), z: Math.sin(p * Math.PI) * 330, phase: 'spring' }
}

export class Game {
  constructor(canvas, { map, level, me, seed, others = [], race = false, zoom = true, onWin, onSend, onToast, onHud }) {
    this.zoomNear = zoom
    this.cv = canvas
    this.g = canvas.getContext('2d')
    this.map = map
    this.level = level
    this.race = race
    this.onWin = onWin || (() => {})
    this.onSend = onSend || (() => {})
    this.onToast = onToast || (() => {})
    this.onHud = onHud || (() => {})
    this.scenery = new Scenery(map)
    this.mini = this.makeMini()
    this.rides = map.shortcuts.map(rideInfo)
    this.parts = []
    this.pops = []
    this.marks = []
    this.shake = 0
    this.startAt = Infinity
    this.lastCount = 4
    this.cloudJig = new Map()
    this.setupWorld(seed)
    // 경주 순서(slot)대로 출발 자리를 정해서 모든 폰에서 같은 자리에 섬
    this.me = this.makePlayer(me, me.slot ?? 0)
    this.me.local = true
    this.players = new Map([[me.id, this.me]])
    others.forEach((o, i) => this.players.set(o.id, this.makePlayer(o, o.slot ?? i + 1)))
    this.lastBeat = 0
    this.stats = { stars: 0, perfect: 0, combo: 0, bestCombo: 0 }
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

  // 씨앗으로 괴물·별·아이템·무너지는 구름을 정함 → 경주하는 모든 폰이 같은 판
  setupWorld(seed) {
    const map = this.map
    const r = rng(seed ^ 0x5eed)
    const plain = map.clouds.filter((c) => !c.role)
    const far = plain.filter((c) => dist(c.cx, c.cy, map.start.cx, map.start.cy) > 320)
    this.mons = []
    for (let i = 0; i < this.level.monsters; i++) {
      const home = i === 0 ? map.monster.home : (() => {
        const c = far[Math.floor(r() * far.length)]
        return [c.cx, c.cy]
      })()
      const scale = MON_SIZES[i % MON_SIZES.length]
      const speed = this.level.speed * (1 + (0.5 - scale) * 1.3)
      this.mons.push({
        segs: planMonster(map, seed + i * 977, { home, speed, firstRest: 1.5 + i * 0.7 }),
        img: map.monster.images[i % map.monster.images.length],
        scale,
        R: Math.min(map.monster.w, map.monster.h) * 0.36 * scale,
        lastSeg: null,
        eatT: -9,
      })
    }
    // 무너지는 구름
    const special = new Set(map.shortcuts.flatMap((sc) => [sc.entry, sc.a, sc.b, sc.at, sc.land].filter(Boolean).map(([x, y]) => cloudAt(map, x, y, 0, 20)?.id)))
    const cand = plain.filter((c) => !special.has(c.id))
    this.crumbleIds = new Set()
    for (let i = 0; i < this.level.crumble && cand.length; i++) this.crumbleIds.add(cand.splice(Math.floor(r() * cand.length), 1)[0].id)
    this.crumble = new Map()
    // 하늘에 뜬 별 + 구름 위 별
    this.stars = []
    const cl = map.clouds
    for (let tries = 0; tries < 400 && this.stars.length < 12; tries++) {
      const a = cl[Math.floor(r() * cl.length)]
      const b = cl[Math.floor(r() * cl.length)]
      const d = dist(a.cx, a.cy, b.cx, b.cy)
      if (a === b || d < 160 || d > 420) continue
      const x = (a.cx + b.cx) / 2
      const y = (a.cy + b.cy) / 2
      if (this.stars.some((s) => dist(s.x, s.y, x, y) < 130)) continue
      this.stars.push({ x, y, z: 55 + r() * 60, got: false })
    }
    for (const c of plain.slice().sort(() => r() - 0.5).slice(0, 4)) this.stars.push({ cloud: c, x: c.cx, y: c.cy, z: 22, got: false })
    // 아이템 상자
    this.boxes = plain
      .filter((c) => !this.crumbleIds.has(c.id))
      .sort(() => r() - 0.5)
      .slice(0, 4)
      .map((c) => ({ cloud: c, x: c.cx, y: c.cy, back: 0 }))
    this.itemRng = rng(seed ^ 0xbeef)
  }

  makePlayer(info, slot) {
    const s = this.map.start
    const [sx, sy] = [[-30, 4], [30, 4], [0, -22], [0, 24], [-26, -18], [26, -18]][slot % 6]
    const ox = s.cx - s.x + sx
    const oy = s.cy - s.y + sy
    return {
      id: info.id,
      name: info.name,
      char: info.char,
      hat: info.hat || null,
      state: 'stand',
      cloud: s,
      ox,
      oy,
      x: s.x + ox,
      y: s.y + oy,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      flaps: 0,
      wingT: -9,
      t0: 0,
      safe: { cloud: s, ox, oy },
      invuln: 0,
      blink: Math.random() * 4,
      look: 0,
      landT: -9,
      fx: {},
      item: null,
      rolling: 0,
    }
  }

  begin(startAt) {
    this.startAt = startAt
  }

  get t() {
    return performance.now() / 1000 - this.startAt
  }

  has(p, k, t = this.t) {
    return (p.fx[k] || 0) > t
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
    const s0 = Math.min(w / this.map.width, (h - top - bottom) / this.map.height)
    this.base = { s0, top, availH: h - top - bottom, w, h }
    if (!this.cam) this.cam = { z: 1, x: this.map.width / 2, y: this.map.height / 2 }
    this.updateCamera(0, 1)
  }

  setZoom(near) {
    this.zoomNear = near
  }

  // 카메라: 처음엔 맵 전체, 출발하면 내 캐릭터를 따라 가까이
  updateCamera(t, dt) {
    const b = this.base
    const map = this.map
    const cam = this.cam
    const near = this.zoomNear && t > -1.4
    const zt = near ? ZOOM : 1
    const k = Math.min(1, dt * 3)
    cam.z += (zt - cam.z) * k
    const s = b.s0 * cam.z
    const vw = b.w / s
    const vh = b.availH / s
    const me = this.me
    const tx = near && me ? me.x : map.width / 2
    const ty = near && me ? me.y - me.z * 0.5 - 40 : map.height / 2
    const kk = Math.min(1, dt * 5)
    cam.x += (tx - cam.x) * kk
    cam.y += (ty - cam.y) * kk
    const cx = vw >= map.width ? map.width / 2 : clamp(cam.x, vw / 2, map.width - vw / 2)
    const cy = vh >= map.height ? map.height / 2 : clamp(cam.y, vh / 2, map.height - vh / 2)
    this.view = { s, x: b.w / 2 - cx * s, y: b.top + b.availH / 2 - cy * s, w: b.w, h: b.h, vw, vh, cx, cy }
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

  // ---------------- 날개짓 ----------------
  tap(x, y) {
    const p = this.me
    const t = this.t
    if (t < 0 || p.done) return
    if (p.state !== 'stand' && p.state !== 'fly') return
    if (this.has(p, 'stuck')) {
      sfx.sticky()
      this.pop('끈끈이! 🍯', p.x, p.y - 80, '#c98a2b')
      return
    }
    const free = this.has(p, 'wings')
    if (p.state === 'stand') p.flaps = 0
    if (!free && p.flaps >= MAX_FLAPS) {
      if (t - (p.tiredT || 0) > 0.4) {
        sfx.tired()
        this.pop('힘들어요!', p.x, p.y - p.z - 90, '#8a7aa8')
      }
      p.tiredT = t
      return
    }
    x = clamp(x, 20, this.map.width - 20)
    y = clamp(y, 20, this.map.height - 20)
    if (p.state === 'stand') {
      p.vx = 0
      p.vy = 0
      p.z = 0
      this.puff(p.x, p.y, 4)
    }
    p.flaps++
    p.state = 'fly'
    p.vz = FLAP_V
    p.tx = x
    p.ty = y
    p.wingT = t
    p.look = Math.sign(x - p.x) || p.look
    this.marks.push({ x, y, t })
    sfx.flap(p.flaps)
    this.onSend('fl', this.flyState(p))
    this.hud()
  }

  flyState(p) {
    const r = (v) => Math.round(v * 10) / 10
    return { x: r(p.x), y: r(p.y), z: r(p.z), vx: r(p.vx), vy: r(p.vy), vz: r(p.vz), tx: r(p.tx), ty: r(p.ty), sp: this.has(p, 'speed') ? 1 : 0 }
  }

  stepFly(p, dt, t) {
    const sp = SPEED * (this.has(p, 'speed', t) || p.spd ? 1.5 : 1)
    const dx = p.tx - p.x
    const dy = p.ty - p.y
    const d = Math.hypot(dx, dy)
    const want = Math.min(sp, d * 3.2)
    const wx = d > 1 ? (dx / d) * want : 0
    const wy = d > 1 ? (dy / d) * want : 0
    const k = Math.min(1, dt * 7)
    p.vx += (wx - p.vx) * k
    p.vy += (wy - p.vy) * k
    p.x = clamp(p.x + p.vx * dt, 10, this.map.width - 10)
    p.y = clamp(p.y + p.vy * dt, 10, this.map.height - 10)
    p.vz -= GRAV * dt
    p.z += p.vz * dt
    if (p.z > MAX_Z) {
      p.z = MAX_Z
      p.vz = Math.min(p.vz, 0)
    }
    if (p.z <= 0 && p.vz < 0) {
      p.z = 0
      p.vz = 0
      return true
    }
    return false
  }

  gone(c, t = this.t) {
    const s = this.crumble.get(c.id)
    return !!s && t >= s.t0 + 1.0 && t < s.t0 + 4.5
  }

  land(p, t) {
    p.flaps = 0
    if (!(p.rideEnd > t - 0.3)) {
      for (let i = 0; i < this.map.shortcuts.length; i++) {
        const [ex, ey] = this.rides[i].entry
        if (dist(p.x, p.y, ex, ey) < 52) return this.startRide(p, i, t)
      }
    }
    const c = cloudAt(this.map, p.x, p.y, t, 9, (c) => this.gone(c, t))
    if (!c) {
      p.state = 'fall'
      p.t0 = t
      if (p.local) {
        sfx.fall()
        this.stats.combo = 0
        this.onSend('f', { k: 'fall', x: Math.round(p.x), y: Math.round(p.y) })
        this.hud()
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
    if (!p.local) return
    sfx.land()
    p.safe = { cloud: c, ox: p.ox, oy: p.oy }
    this.onSend('p', { c: c.id, ox: p.ox, oy: p.oy })
    if (this.crumbleIds.has(c.id) && !this.crumble.has(c.id)) {
      this.crumble.set(c.id, { t0: t })
      sfx.crack()
    }
    if (c.role === 'goal' && !p.done) return this.win(p, t)
    if (c.role) return
    const s = this.stats
    s.combo++
    s.bestCombo = Math.max(s.bestCombo, s.combo)
    const near = dist(p.x, p.y, c.cx + dx, c.cy + dy) < Math.min(c.w, c.h) * 0.22
    if (near) {
      s.perfect++
      sfx.perfect()
      this.pop('PERFECT!', p.x, p.y - 100, '#ff5c9a', 1.2)
      this.spark(p.x, p.y - 20, 6)
    } else if (s.combo >= 3) this.pop(`콤보 ${s.combo}!`, p.x, p.y - 95, '#7a5cff')
    this.hud()
  }

  startRide(p, i, t) {
    p.state = 'ride'
    p.ride = i
    p.t0 = t
    p.step = -1
    const sc = this.map.shortcuts[i]
    if (p.local) {
      this.onToast(sc.type === 'ladder' ? '지름길! 사다리 미끄럼틀 🛝' : sc.type === 'portal' ? '순간이동 포털! 🌀' : '점프 버섯! 🍄')
      if (sc.type === 'portal') sfx.portal()
      if (sc.type === 'spring') {
        sfx.spring()
        sc.boing = t
      }
      this.onSend('r', { i })
    }
  }

  win(p, t) {
    p.done = true
    p.state = 'win'
    p.finishT = t
    sfx.win()
    this.confetti(this.map.door[0], this.map.door[1])
    this.onSend('w', { time: t })
    this.onWin(t, { ...this.stats })
  }

  respawn(p, t, toStart) {
    if (toStart) {
      const st = this.map.start
      p.safe = { cloud: st, ox: st.cx - st.x + (Math.random() * 30 - 15), oy: st.cy - st.y + (Math.random() * 16 - 8) }
    }
    const s = p.safe
    p.cloud = this.gone(s.cloud, t) ? this.map.start : s.cloud
    p.ox = p.cloud === s.cloud ? s.ox : this.map.start.cx - this.map.start.x
    p.oy = p.cloud === s.cloud ? s.oy : this.map.start.cy - this.map.start.y
    p.state = 'stand'
    p.flaps = 0
    p.invuln = t + (toStart ? 2.2 : 1.3)
    this.onSend('p', { c: p.cloud.id, ox: p.ox, oy: p.oy, inv: p.invuln - t })
  }

  updatePlayer(p, t, dt) {
    p.wing = Math.max(0, 1 - (t - p.wingT) * 3.2)
    if (p.state === 'stand' || p.state === 'win') {
      const c = p.cloud
      const [dx, dy] = cloudOffset(c, t)
      p.x = c.x + dx + p.ox
      p.y = c.y + dy + p.oy
      p.z = p.state === 'win' ? Math.abs(Math.sin(t * 6)) * 18 : 0
      if (p.local && p.state === 'stand' && this.gone(c, t)) {
        p.state = 'fall'
        p.t0 = t
        sfx.fall()
        this.stats.combo = 0
        this.onSend('f', { k: 'fall', x: Math.round(p.x), y: Math.round(p.y) })
      }
    } else if (p.state === 'fly') {
      if (this.stepFly(p, dt, t)) {
        if (p.local) this.land(p, t)
        else p.state = 'wait'
      }
    } else if (p.state === 'ride') {
      const sc = this.map.shortcuts[p.ride]
      const info = this.rides[p.ride]
      const e = t - p.t0
      const rp = ridePos(sc, info, e)
      p.x = rp.x
      p.y = rp.y
      p.z = rp.z
      p.rphase = rp.phase
      p.rp = rp.p
      if (p.local) {
        if (rp.phase === 'climb' && rp.step !== p.step) {
          p.step = rp.step
          sfx.ladderStep(rp.step)
        }
        if (rp.phase === 'slide' && !p.slid) {
          p.slid = true
          sfx.slide()
        }
      }
      if (rp.phase === 'slide' && Math.random() < 0.5) this.spark(p.x, p.y, 1)
      if (rp.phase === 'out' && Math.random() < 0.4) this.spark(p.x, p.y - 30, 1)
      if (e >= info.total) {
        p.slid = false
        p.x = info.end[0]
        p.y = info.end[1]
        p.z = 0
        p.rideEnd = t
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
  updateMonsters(t) {
    const p = this.me
    const frozen = this.has(p, 'freeze', t)
    for (const mo of this.mons) {
      let m = monsterAt(mo.segs, Math.max(0, t))
      if (frozen) {
        if (!mo.ice) mo.ice = m
        m = mo.ice
      } else mo.ice = null
      const s = m.seg
      if (s !== mo.lastSeg && t > 0 && !frozen) {
        const near = clamp(1 - dist(m.x, m.y, p.x, p.y) / 700, 0.1, 1) * (mo.scale / 0.5)
        if (s.type === 'air') sfx.monsterHop(0.3 * near)
        if (s.type === 'crouch' && s.big) sfx.monsterGrowl()
        if (s.type === 'rest' && s.land) {
          this.splat(m.x, m.y, s.big ? 14 : 6, mo)
          if (s.big) {
            this.shake = Math.max(this.shake, 0.4 * near + 0.1)
            sfx.monsterThud(0.6 * near)
          } else sfx.monsterThud(0.25 * near)
          const c = cloudAt(this.map, m.x, m.y, t, 30)
          if (c) this.cloudJig.set(c.id, t)
        }
        mo.lastSeg = s
      }
      mo.now = m
      if (t <= 0 || p.done || t < p.invuln || frozen) continue
      const vulnerable = p.state === 'stand' || p.state === 'fly' || (p.state === 'ride' && p.rphase !== 'in' && p.rphase !== 'out')
      const body = 140 * mo.scale
      if (!vulnerable || p.z > m.z + body || m.z > p.z + 40) continue
      if (dist(p.x, p.y, m.x, m.y + 10) > mo.R + HIT) continue
      if (this.has(p, 'shield', t)) {
        p.fx.shield = 0
        p.invuln = t + 1.2
        sfx.bonk()
        this.pop('방패로 막았다! 🛡️', p.x, p.y - 90, '#3a8dff')
        this.spark(p.x, p.y - 30, 10)
        this.hud()
        continue
      }
      p.state = 'eaten'
      p.t0 = t
      p.eatX = m.x
      p.eatY = m.y
      mo.eatT = t
      this.shake = 0.3
      this.stats.combo = 0
      sfx.eaten()
      this.onToast('냠! 괴물에게 먹혔어요 😵 처음부터!')
      this.onSend('f', { k: 'eaten', x: Math.round(m.x), y: Math.round(m.y) })
      this.hud()
      break
    }
  }

  // ---------------- 별·아이템 ----------------
  starPos(s, t) {
    if (!s.cloud) return [s.x, s.y]
    const [dx, dy] = cloudOffset(s.cloud, t)
    return [s.cloud.cx + dx, s.cloud.cy + dy]
  }

  updatePickups(t, dt) {
    const p = this.me
    if (p.state === 'eaten' || p.state === 'fall' || t < 0) return
    const mag = this.has(p, 'magnet', t)
    for (const s of this.stars) {
      if (s.got) continue
      let [x, y] = this.starPos(s, t)
      if (s.pull) {
        s.pull = Math.min(1, s.pull + dt * 3)
        x = lerp(x, p.x, s.pull)
        y = lerp(y, p.y - p.z - 20, s.pull)
      } else if (mag && dist(x, y, p.x, p.y) < 280) s.pull = 0.01
      const zOk = s.pull || Math.abs(p.z + 20 - s.z) < 60
      if ((s.pull >= 1 || dist(x, y, p.x, p.y) < 44) && zOk) {
        s.got = true
        this.stats.stars++
        sfx.star(this.stats.stars)
        this.spark(x, y - s.z, 5)
        this.pop('+⭐', x, y - s.z - 30, '#f2a900', 0.8)
        this.hud()
      }
    }
    for (const b of this.boxes) {
      if (t < b.back) continue
      const [x, y] = this.starPos(b, t)
      if (dist(x, y, p.x, p.y) < 48 && p.z < 90 && !p.item && !p.rolling) {
        b.back = t + 9
        p.rolling = t + 1.1
        sfx.box()
        this.spark(x, y - 40, 8)
        this.hud()
      }
    }
    if (p.rolling && t >= p.rolling) {
      p.rolling = 0
      const pool = ['shield', 'wings', 'freeze', 'magnet', 'speed']
      if (this.race && this.players.size > 1) pool.push('sticky', 'sticky')
      p.item = pool[Math.floor(this.itemRng() * pool.length)]
      sfx.item()
      this.onToast(`${ITEMS[p.item].emoji} ${ITEMS[p.item].name}! 아이템 버튼을 눌러요`)
      this.hud()
    }
  }

  useItem() {
    const p = this.me
    const t = this.t
    if (!p.item || p.done || t < 0) return
    const k = p.item
    p.item = null
    const it = ITEMS[k]
    if (k === 'sticky') {
      const goal = this.map.goal
      const others = [...this.players.values()].filter((q) => !q.local && !q.done)
      others.sort((a, b) => dist(a.x, a.y, goal.cx, goal.cy) - dist(b.x, b.y, goal.cx, goal.cy))
      const tg = others[0]
      if (tg) {
        this.onSend('hit', { to: tg.id })
        tg.fx.stuck = t + 2.2
        this.onToast(`🍯 ${tg.name}에게 끈끈이 발사!`)
        sfx.sticky()
      }
    } else {
      p.fx[k] = t + it.dur
      if (k === 'shield') sfx.shield()
      else if (k === 'freeze') {
        sfx.freeze()
        this.shake = 0.2
      } else sfx.item()
      this.pop(`${it.emoji} ${it.name}!`, p.x, p.y - p.z - 100, '#ff5c9a')
    }
    this.hud()
  }

  hud() {
    const p = this.me
    const t = this.t
    const fx = Object.keys(ITEMS).filter((k) => k !== 'sticky' && this.has(p, k, t))
    this.onHud({
      stars: this.stats.stars,
      item: p.item,
      rolling: !!p.rolling,
      flaps: this.has(p, 'wings', t) ? Infinity : MAX_FLAPS - (p.state === 'fly' ? p.flaps : 0),
      fx,
    })
  }

  // ---------------- 친구 ----------------
  addOther(o) {
    if (!this.players.has(o.id)) this.players.set(o.id, this.makePlayer(o, this.players.size))
  }

  removeOther(id) {
    if (id !== this.me.id) this.players.delete(id)
  }

  remote(id, type, d) {
    const t = this.t
    if (type === 'hit') {
      const tg = this.players.get(d.to)
      if (!tg) return
      tg.fx.stuck = t + 2.2
      if (tg.local) {
        sfx.sticky()
        this.onToast(`🍯 ${this.players.get(id)?.name || '친구'}의 끈끈이에 붙었어요!`)
      }
      return
    }
    const p = this.players.get(id)
    if (!p || p.local) return
    if (type === 'emo') {
      p.emo = { e: d.e, t }
      sfx.chime()
      return
    }
    if (type === 'fl') {
      Object.assign(p, { x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, tx: d.tx, ty: d.ty, spd: d.sp })
      p.state = 'fly'
      p.wingT = t
      p.look = Math.sign(d.tx - d.x) || p.look
    } else if (type === 'p') {
      const c = this.map.clouds[d.c]
      if (!c) return
      if (p.state !== 'stand' && p.state !== 'win') this.cloudJig.set(c.id, t)
      p.cloud = c
      p.ox = d.ox
      p.oy = d.oy
      if (p.state !== 'win') p.state = 'stand'
      if (d.inv) p.invuln = t + d.inv
    } else if (type === 'r') {
      this.startRide(p, d.i, t)
    } else if (type === 'f') {
      p.state = d.k
      p.t0 = t
      if (d.k === 'eaten') {
        p.eatX = d.x
        p.eatY = d.y
      }
      if (d.k === 'fall') {
        p.x = d.x
        p.y = d.y
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

  emote(id, e) {
    const p = this.players.get(id)
    if (!p) return
    p.emo = { e, t: this.t }
    if (p.local) this.onSend('emo', { e })
    sfx.chime()
  }

  // 미니맵: 맵 전체를 작게 + 나·친구·괴물·문 위치
  makeMini() {
    const map = this.map
    const w = 84
    const h = Math.round((w * map.height) / map.width)
    const cv = document.createElement('canvas')
    cv.width = w * 2
    cv.height = h * 2
    const g = cv.getContext('2d')
    g.scale((w * 2) / map.width, (h * 2) / map.height)
    g.drawImage(this.scenery.canvas, 0, 0, map.width, map.height)
    for (const c of map.clouds) g.drawImage(c.image, c.x, c.y)
    return { cv, w, h }
  }

  drawMini(g, v, t, now) {
    if (this.view.vw >= this.map.width - 1 && this.view.vh >= this.map.height - 1) return
    const { cv, w, h } = this.mini
    const x = v.w - w - 10
    const y = 64 + (this.race ? 30 : 0)
    const sx = w / this.map.width
    const sy = h / this.map.height
    g.save()
    g.globalAlpha = 0.92
    this.round(g, x - 3, y - 3, w + 6, h + 6, 10)
    g.fillStyle = '#fff'
    g.fill()
    g.drawImage(cv, x, y, w, h)
    g.globalAlpha = 1
    // 보이는 곳
    g.strokeStyle = 'rgba(255,92,154,0.9)'
    g.lineWidth = 1.5
    g.strokeRect(x + (v.cx - v.vw / 2) * sx, y + (v.cy - v.vh / 2) * sy, v.vw * sx, v.vh * sy)
    const dot = (px, py, r, c) => {
      g.fillStyle = c
      g.beginPath()
      g.arc(x + px * sx, y + py * sy, r, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#ffd84a'
    star(g, x + this.map.door[0] * sx, y + this.map.door[1] * sy, 6)
    for (const mo of this.mons) if (mo.now) dot(mo.now.x, mo.now.y, 3, '#ff4d6d')
    for (const p of this.players.values()) if (!p.local) dot(p.x, p.y, 3, '#5a7bff')
    const blink = Math.floor(now * 4) % 2 ? 4 : 3
    dot(this.me.x, this.me.y, blink, '#ff5c9a')
    g.restore()
  }

  // ---------------- 효과 ----------------
  pop(text, x, y, color, size = 1) {
    this.pops.push({ text, x, y, color, size, t: this.t })
  }

  puff(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      this.parts.push({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 25, life: 0.45, max: 0.45, r: 7 + Math.random() * 5, c: 'rgba(255,255,255,0.9)', k: 'puff' })
    }
  }

  splat(x, y, n, mo) {
    const c = ['rgba(120,220,120,0.8)', 'rgba(255,140,190,0.8)', 'rgba(120,180,255,0.8)', 'rgba(255,180,90,0.8)', 'rgba(190,140,255,0.8)'][this.mons.indexOf(mo) % 5]
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 80 + Math.random() * 160
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, life: 0.6, max: 0.6, r: (5 + Math.random() * 7) * mo.scale * 2, c, k: 'puff' })
    }
  }

  spark(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x: x + Math.random() * 20 - 10, y, vx: Math.random() * 80 - 40, vy: -40 - Math.random() * 60, life: 0.55, max: 0.55, r: 6, c: '#fff6a8', k: 'star' })
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
      this.hud()
    }
    if (this.me.state === 'stand' && t - this.lastBeat > 1 && t > 0) {
      this.lastBeat = t
      this.onSend('p', { c: this.me.cloud.id, ox: this.me.ox, oy: this.me.oy, hb: 1 })
    }
    const fxOn = Object.keys(this.me.fx).filter((k) => this.has(this.me, k, t)).join()
    if (fxOn !== this.fxWas) {
      this.fxWas = fxOn
      this.hud()
    }
    for (const p of this.players.values()) this.updatePlayer(p, t, dt)
    this.updateMonsters(t)
    this.updatePickups(t, dt)
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
    this.pops = this.pops.filter((m) => t - m.t < 1.1)
    this.shake = Math.max(0, this.shake - dt)
    this.updateCamera(t, dt)
    this.draw(t, now, dt)
  }

  draw(t, now, dt) {
    const g = this.g
    const v = this.view
    const dpr = this.dpr
    const map = this.map
    const night = map.theme === 'night'
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.fillStyle = night ? '#171042' : '#bfe6ff'
    g.fillRect(0, 0, v.w, v.h)

    const sh = this.shake > 0 ? this.shake * 16 : 0
    const sx = sh ? (Math.random() - 0.5) * sh : 0
    const sy = sh ? (Math.random() - 0.5) * sh : 0
    g.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * (v.x + sx), dpr * (v.y + sy))
    g.save()
    g.beginPath()
    g.rect(0, 0, map.width, map.height)
    g.clip()
    this.scenery.draw(g, now, dt)
    g.restore()

    this.drawShortcuts(g, t, now, 'under')
    const occupied = new Set()
    for (const p of this.players.values()) if (p.state === 'stand' || p.state === 'win') occupied.add(p.cloud.id)
    const monClouds = new Set()
    for (const mo of this.mons) {
      const m = mo.now
      if (m && m.z < 30) {
        const c = cloudAt(map, m.x, m.y, t, 25)
        if (c) monClouds.add(c.id)
      }
    }
    for (const c of map.clouds) {
      if (this.gone(c, t)) continue
      const [dx, dy] = cloudOffset(c, t)
      g.drawImage(c.shadow, c.x + dx + 7, c.y + dy + 12)
    }
    for (const c of map.clouds) this.drawCloud(g, c, t, occupied.has(c.id), monClouds.has(c.id))
    this.drawShortcuts(g, t, now, 'over')
    this.drawDoor(g, t, now)
    this.drawPickups(g, t, now)

    // 날아갈 곳 표시
    for (const mk of this.marks) {
      const k = (t - mk.t) / 0.5
      g.strokeStyle = `rgba(255,120,170,${1 - k})`
      g.lineWidth = 5
      g.beginPath()
      g.arc(mk.x, mk.y, 12 + k * 26, 0, Math.PI * 2)
      g.stroke()
    }

    const list = []
    for (const p of this.players.values()) list.push({ y: p.y + (p.z > 40 ? 5000 : 0), p })
    for (const mo of this.mons) {
      const m = mo.now
      if (!m) continue
      mo.foot = m.y + map.monster.h * mo.scale * 0.42
      list.push({ y: mo.foot + (m.z > 40 ? 5000 + m.z : 0), mo })
    }
    list.sort((a, b) => a.y - b.y)
    for (const p of this.players.values()) this.drawShadow(g, p.x, p.y, PR * 0.9, p.z, p.state)
    for (const mo of this.mons) if (mo.now) this.drawShadow(g, mo.now.x, mo.foot, mo.R * 1.1, mo.now.z, 'mon')
    for (const it of list) {
      if (it.mo) this.drawMonster(g, it.mo, t, now)
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
        star(g, q.x, q.y, q.r * (0.5 + a))
      } else {
        g.beginPath()
        g.arc(q.x, q.y, q.r * (1.4 - a * 0.4), 0, Math.PI * 2)
        g.fill()
      }
    }
    g.globalAlpha = 1

    // 화면 크기 기준 글씨
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.textAlign = 'center'
    g.font = '700 12px Jua, sans-serif'
    for (const p of this.players.values()) {
      if ((p.state === 'eaten' && t - p.t0 > 0.5) || p.state === 'fall') continue
      const x = v.x + p.x * v.s
      const y = v.y + (p.y - p.z - PR * (p.hat ? 3.2 : 2.7)) * v.s - 8
      const w = g.measureText(p.name).width + 12
      g.fillStyle = p.local ? 'rgba(255,105,160,0.92)' : 'rgba(90,90,140,0.8)'
      this.round(g, x - w / 2, y - 14, w, 18, 9)
      g.fill()
      g.fillStyle = '#fff'
      g.fillText(p.name, x, y)
      if (p.emo && t - p.emo.t < 2.2) {
        const k = Math.min(1, (t - p.emo.t) * 6)
        g.save()
        g.translate(x, y - 34)
        g.scale(k, k)
        g.fillStyle = '#fff'
        g.strokeStyle = 'rgba(90,60,110,0.3)'
        g.lineWidth = 2
        g.beginPath()
        g.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2)
        g.moveTo(-6, 17)
        g.lineTo(0, 28)
        g.lineTo(6, 17)
        g.fill()
        g.stroke()
        g.font = '24px sans-serif'
        g.textBaseline = 'middle'
        g.fillText(p.emo.e, 0, 2)
        g.restore()
        g.textBaseline = 'alphabetic'
        g.font = '700 12px Jua, sans-serif'
      }
      if (p.local && (p.state === 'fly' || p.state === 'stand') && !p.done) {
        // 남은 날개짓
        const free = this.has(p, 'wings', t)
        const left = free ? MAX_FLAPS : MAX_FLAPS - (p.state === 'fly' ? p.flaps : 0)
        for (let i = 0; i < MAX_FLAPS; i++) {
          g.fillStyle = i < left ? (free ? COLORS[(i + Math.floor(now * 6)) % 6] : '#fff') : 'rgba(255,255,255,0.3)'
          g.strokeStyle = 'rgba(255,105,160,0.9)'
          g.lineWidth = 1.5
          g.beginPath()
          g.ellipse(x + (i - 1) * 13, y + 9, 5, 3.5, -0.5, 0, Math.PI * 2)
          g.fill()
          g.stroke()
        }
      }
    }
    for (const pp of this.pops) {
      const k = (t - pp.t) / 1.1
      const x = v.x + pp.x * v.s
      const y = v.y + pp.y * v.s - k * 30
      g.globalAlpha = 1 - k * k
      g.font = `${Math.round(18 * pp.size * (1 + Math.max(0, 0.3 - k)))}px Jua, sans-serif`
      g.lineWidth = 5
      g.strokeStyle = '#fff'
      g.strokeText(pp.text, x, y)
      g.fillStyle = pp.color
      g.fillText(pp.text, x, y)
    }
    g.globalAlpha = 1
    if (this.has(this.me, 'freeze', t)) {
      g.fillStyle = 'rgba(160,220,255,0.12)'
      g.fillRect(0, 0, v.w, v.h)
    }
    this.drawMini(g, v, t, now)
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

  drawShadow(g, x, y, r, z, state) {
    if (state === 'fall' || state === 'eaten' || state === 'wait') return
    const k = 1 / (1 + z / 120)
    g.fillStyle = `rgba(40,20,90,${0.25 * k})`
    g.beginPath()
    g.ellipse(x, y + 2, r * k, r * 0.4 * k, 0, 0, Math.PI * 2)
    g.fill()
  }

  drawCloud(g, c, t, occupied, scared) {
    const [dx, dy] = cloudOffset(c, t)
    const cr = this.crumble.get(c.id)
    let alpha = 1
    let shakeX = 0
    if (cr) {
      const e = t - cr.t0
      if (e >= 1.0 && e < 4.5) {
        if (!cr.burst) {
          cr.burst = true
          this.puff(c.cx + dx, c.cy + dy, 14)
        }
        if (e > 4.1) alpha = (e - 4.1) / 0.4
        else return
      } else if (e < 1.0) shakeX = Math.sin(e * 60) * 4 * e
      else if (e >= 4.5) {
        this.crumble.delete(c.id)
        return this.drawCloud(g, c, t, occupied, scared)
      }
    }
    const jt = this.cloudJig.get(c.id)
    let j = 0
    if (jt !== undefined && t - jt < 1.2) j = Math.exp(-(t - jt) * 4.5) * Math.sin((t - jt) * 26) * 0.13
    const bx = c.x + dx + c.w / 2 + shakeX
    const by = c.y + dy + c.h
    g.save()
    g.globalAlpha = alpha
    g.translate(bx, by)
    g.scale(1 + j, 1 - j)
    g.drawImage(c.image, -c.w / 2, -c.h)
    const fx = c.cx - c.x - c.w / 2
    const fy0 = c.cy - c.y - c.h
    if (this.crumbleIds.has(c.id)) {
      // 금 간 구름: 위쪽에서 갈라지는 금
      const k = Math.min(c.w, c.h)
      const cx = fx + k * 0.22
      const cy = fy0 - k * 0.22
      g.lineCap = 'round'
      g.lineJoin = 'round'
      for (const [col, wd] of [
        ['rgba(255,255,255,0.8)', 5],
        ['rgba(80,50,70,0.75)', 2.5],
      ]) {
        g.strokeStyle = col
        g.lineWidth = wd
        g.beginPath()
        for (const a of [-2.2, -0.9, 0.5, 1.9]) {
          g.moveTo(cx, cy)
          g.lineTo(cx + Math.cos(a) * k * 0.1, cy + Math.sin(a) * k * 0.1)
          g.lineTo(cx + Math.cos(a + 0.4) * k * 0.17, cy + Math.sin(a + 0.4) * k * 0.17)
        }
        g.stroke()
      }
    }
    if (c.face) {
      const f = clamp(Math.min(c.w, c.h) * 0.08, 5, 13)
      const fy = fy0 + f * 0.5
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
    if (c.role === 'start') this.flag(g, c.cx + dx - 34, c.cy + dy - 6, '출발', '#4fcf9f')
  }

  flag(g, x, y, text, color) {
    g.save()
    g.strokeStyle = '#7a5a4a'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x, y - 70)
    g.stroke()
    g.fillStyle = color
    g.beginPath()
    g.moveTo(x, y - 70)
    g.lineTo(x + 66, y - 58)
    g.lineTo(x, y - 44)
    g.closePath()
    g.fill()
    g.fillStyle = '#fff'
    g.font = '20px Jua, sans-serif'
    g.textAlign = 'left'
    g.fillText(text, x + 6, y - 50)
    g.restore()
  }

  drawShortcuts(g, t, now, layer) {
    for (const sc of this.map.shortcuts) {
      // 사다리는 구름 아래, 포털·버섯은 구름 위에
      if ((sc.type === 'ladder') !== (layer === 'under')) continue
      if (sc.type === 'ladder') this.drawLadder(g, sc, now)
      else if (sc.type === 'portal') this.drawPortal(g, sc, now)
      else this.drawSpring(g, sc, t, now)
      const [x, y] = rideInfo(sc).entry
      const b = Math.abs(Math.sin(now * 4)) * 8
      g.save()
      g.font = '24px Jua, sans-serif'
      g.textAlign = 'center'
      g.lineWidth = 6
      g.strokeStyle = '#fff'
      g.fillStyle = '#ff5c9a'
      const lbl = sc.type === 'ladder' ? '지름길' : sc.type === 'portal' ? '포털' : '점프 버섯'
      const ly = y - (sc.type === 'spring' ? 78 : 62) - b
      g.strokeText(lbl, x, ly)
      g.fillText(lbl, x, ly)
      g.restore()
    }
  }

  drawLadder(g, sc, now) {
    const [a, b] = sc.climb
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const L = Math.hypot(dx, dy)
    const nx = (-dy / L) * 16
    const ny = (dx / L) * 16
    g.save()
    g.lineCap = 'round'
    // 무지개 미끄럼틀
    const rainbow = ['#ff8fab', '#ffc46b', '#fff07a', '#8fe3a0', '#8fc8ff', '#c49bff']
    rainbow.forEach((c, i) => {
      g.strokeStyle = c
      g.lineWidth = 9
      g.beginPath()
      sc.slide.forEach(([x, y], k) => {
        const o = (i - 2.5) * 7
        k ? g.lineTo(x + o, y) : g.moveTo(x + o, y)
      })
      g.stroke()
    })
    // 사다리
    g.strokeStyle = '#b07a4f'
    g.lineWidth = 8
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(a[0] + nx * s, a[1] + ny * s)
      g.lineTo(b[0] + nx * s, b[1] + ny * s)
      g.stroke()
    }
    g.lineWidth = 6
    g.strokeStyle = '#d9a46c'
    for (let k = 0.08; k < 1; k += 0.11) {
      const x = a[0] + dx * k
      const y = a[1] + dy * k
      g.beginPath()
      g.moveTo(x + nx, y + ny)
      g.lineTo(x - nx, y - ny)
      g.stroke()
    }
    // 입구 표시
    const [ex, ey] = sc.entry
    g.fillStyle = `rgba(255,240,120,${0.35 + Math.sin(now * 4) * 0.12})`
    g.beginPath()
    g.ellipse(ex, ey, 42, 22, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  drawPortal(g, sc, now) {
    for (const [i, [x, y]] of [sc.a, sc.b].entries()) {
      g.save()
      g.translate(x, y - 6)
      for (let k = 0; k < 4; k++) {
        g.strokeStyle = i ? `hsla(${(170 + k * 25 + now * 80) % 360},90%,65%,0.9)` : `hsla(${(280 + k * 25 + now * 80) % 360},90%,70%,0.9)`
        g.lineWidth = 5
        g.beginPath()
        g.ellipse(0, 0, 42 - k * 9, 20 - k * 4, 0, now * (3 + k) * (i ? -1 : 1), now * (3 + k) * (i ? -1 : 1) + Math.PI * 1.5)
        g.stroke()
      }
      g.fillStyle = i ? 'rgba(120,255,230,0.35)' : 'rgba(210,140,255,0.35)'
      g.beginPath()
      g.ellipse(0, 0, 40, 19, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
  }

  drawSpring(g, sc, t, now) {
    const [x, y] = sc.at
    const e = t - (sc.boing || -9)
    const sq = e < 0.6 ? Math.exp(-e * 6) * Math.sin(e * 30) * 0.35 : 0
    g.save()
    g.translate(x, y + 6)
    g.scale(1 + sq, 1 - sq)
    g.fillStyle = '#fff3dd'
    g.strokeStyle = '#8a5a4a'
    g.lineWidth = 4
    g.beginPath()
    g.roundRect ? g.roundRect(-13, -26, 26, 28, 8) : g.rect(-13, -26, 26, 28)
    g.fill()
    g.stroke()
    g.fillStyle = '#ff6b8b'
    g.beginPath()
    g.ellipse(0, -28, 38, 24, 0, Math.PI, 0)
    g.closePath()
    g.fill()
    g.stroke()
    g.fillStyle = '#fff'
    for (const [dx, dy, r] of [
      [-18, -36, 6],
      [8, -42, 7],
      [22, -32, 5],
    ]) {
      g.beginPath()
      g.arc(dx, dy, r, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  }

  drawDoor(g, t, now) {
    const [x, y] = this.map.door
    const done = this.me.done
    g.save()
    const glow = g.createRadialGradient(x, y - 30, 5, x, y - 30, 95)
    glow.addColorStop(0, 'rgba(255,240,150,0.7)')
    glow.addColorStop(1, 'rgba(255,240,150,0)')
    g.fillStyle = glow
    g.beginPath()
    g.arc(x, y - 30, 95 + Math.sin(now * 3) * 6, 0, Math.PI * 2)
    g.fill()
    const w = 50
    const h = 66
    const top = y - h + 6
    g.fillStyle = done ? '#5a3d6b' : this.map.theme === 'night' ? '#9b7bff' : '#ff9ec7'
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
      g.fillStyle = '#ffd1e6'
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
      star(g, x, top + 24, 11)
      g.beginPath()
      g.arc(x + 14, y - 18, 4, 0, Math.PI * 2)
      g.fill()
    }
    const b = Math.sin(now * 4) * 5
    g.font = '30px Jua, sans-serif'
    g.textAlign = 'center'
    g.lineWidth = 7
    g.strokeStyle = '#fff'
    g.fillStyle = '#ff5c9a'
    g.strokeText('도착!', x, y - 80 + b)
    g.fillText('도착!', x, y - 80 + b)
    g.restore()
  }

  drawPickups(g, t, now) {
    for (const s of this.stars) {
      if (s.got) continue
      let [x, y] = this.starPos(s, t)
      if (s.pull) {
        x = lerp(x, this.me.x, s.pull)
        y = lerp(y, this.me.y, s.pull)
      }
      const bob = Math.sin(now * 3 + x) * 5
      if (!s.cloud) {
        g.fillStyle = 'rgba(40,20,90,0.15)'
        g.beginPath()
        g.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2)
        g.fill()
      }
      const yy = y - s.z + bob
      g.fillStyle = '#ffd84a'
      g.strokeStyle = '#e8a400'
      g.lineWidth = 3
      star(g, x, yy, 17)
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.beginPath()
      g.arc(x - 5, yy - 5, 3.5, 0, Math.PI * 2)
      g.fill()
    }
    for (const b of this.boxes) {
      if (t < b.back) continue
      const [x, y] = this.starPos(b, t)
      const yy = y - 42 + Math.sin(now * 2.5 + x) * 5
      g.save()
      g.translate(x, yy)
      g.rotate(Math.sin(now * 2 + x) * 0.12)
      g.fillStyle = `hsl(${(now * 90 + x) % 360},85%,70%)`
      g.strokeStyle = '#fff'
      g.lineWidth = 4
      g.beginPath()
      g.roundRect ? g.roundRect(-20, -20, 40, 40, 9) : g.rect(-20, -20, 40, 40)
      g.fill()
      g.stroke()
      g.fillStyle = '#fff'
      g.font = '28px Jua, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('?', 0, 2)
      g.restore()
    }
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
    const flying = p.state === 'fly'
    if (flying) {
      mood = p.vz > 0 ? 'jump' : 'idle'
      sx = 0.95
      sy = 1.06
      rot = clamp(p.vx / 900, -0.25, 0.25)
    } else if (p.state === 'stand') {
      const k = t - p.landT
      if (k < 0.3) {
        const s = Math.sin((k / 0.3) * Math.PI) * 0.25
        sx = 1 + s
        sy = 1 - s
      } else sy = 1 + Math.sin(now * 5 + p.blink) * 0.03
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
        g.fillStyle = '#ffe27a'
        for (let i = 0; i < 3; i++) {
          const a = now * 5 + (i * Math.PI * 2) / 3
          star(g, p.eatX + Math.cos(a) * 40, p.eatY - 70 + Math.sin(a) * 12, 10)
        }
        return
      }
    } else if (p.state === 'ride') {
      mood = p.rphase === 'climb' ? 'idle' : 'happy'
      if (p.rphase === 'fly' || p.rphase === 'spring') rot = Math.sin(now * 20) * 0.2
      if (p.rphase === 'in') {
        r = PR * (1 - p.rp)
        rot = p.rp * 10
      }
      if (p.rphase === 'out') {
        r = PR * p.rp
        rot = (1 - p.rp) * 10
      }
    } else if (p.state === 'win') mood = 'happy'
    else if (p.state === 'wait') alpha = 0.75
    if (t < p.invuln && Math.floor(now * 10) % 2 === 0) alpha *= 0.35
    const blink = (now + p.blink) % 3.2 < 0.12
    const wing = flying ? Math.max(p.wing, 0.35 + Math.sin(now * 14) * 0.15) : p.state === 'stand' ? 0 : 0.5
    g.globalAlpha = alpha
    if (this.has(p, 'speed', t) && flying) {
      g.strokeStyle = 'rgba(255,230,90,0.8)'
      g.lineWidth = 4
      for (let i = -1; i <= 1; i++) {
        g.beginPath()
        g.moveTo(x - p.vx * 0.12, y - PR + i * 12 - p.vy * 0.12)
        g.lineTo(x - p.vx * 0.3, y - PR + i * 12 - p.vy * 0.3)
        g.stroke()
      }
    }
    drawChar(g, p.char, x, y, r, { sx, sy, rot, mood, blink, look: p.look || 0, wing, hat: p.hat })
    if (this.has(p, 'stuck', t)) {
      g.fillStyle = 'rgba(201,138,43,0.75)'
      for (const [dx, dy, rr] of [
        [-14, -30, 12],
        [10, -18, 10],
        [0, -44, 9],
        [16, -40, 7],
      ]) {
        g.beginPath()
        g.arc(x + dx, y + dy, rr, 0, Math.PI * 2)
        g.fill()
      }
    }
    if (this.has(p, 'shield', t)) {
      g.strokeStyle = `rgba(110,180,255,${0.6 + Math.sin(now * 8) * 0.2})`
      g.fillStyle = 'rgba(160,210,255,0.18)'
      g.lineWidth = 4
      g.beginPath()
      g.arc(x, y - PR, PR * 1.7, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    }
    if (this.has(p, 'magnet', t)) {
      g.font = '22px sans-serif'
      g.textAlign = 'center'
      g.fillText('🧲', x + PR * 1.3, y - PR * 2)
    }
    g.globalAlpha = 1
  }

  drawMonster(g, mo, t, now) {
    const mm = this.map.monster
    const m = mo.now
    const s = m.seg
    const frozen = !!mo.ice
    let sx = 1
    let sy = 1
    let shakeX = 0
    if (frozen) {
      shakeX = Math.sin(now * 40) * 1.5
    } else if (s.type === 'crouch') {
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
    const sc = mo.scale
    const x = m.x + shakeX
    const y = m.y - m.z
    g.save()
    g.translate(x, y + (mm.h * sc) / 2)
    g.scale(sc * sx, sc * sy)
    g.translate(-mm.w / 2, -mm.h)
    g.drawImage(mo.img, 0, 0)
    const me = this.me
    const ang = Math.atan2(me.y - m.y, me.x - m.x)
    const blink = (now + sc * 7) % 4.3 < 0.13
    const angry = !frozen && (s.type === 'crouch' || mo.eatT > t - 0.9)
    for (const e of mm.eyes) {
      g.fillStyle = '#fff'
      g.strokeStyle = '#3d3540'
      g.lineWidth = 6
      if (blink || frozen) {
        g.beginPath()
        if (frozen) {
          g.moveTo(e.x - e.r * 0.7, e.y - e.r * 0.5)
          g.lineTo(e.x + e.r * 0.7, e.y + e.r * 0.5)
          g.moveTo(e.x + e.r * 0.7, e.y - e.r * 0.5)
          g.lineTo(e.x - e.r * 0.7, e.y + e.r * 0.5)
        } else {
          g.moveTo(e.x - e.r, e.y)
          g.lineTo(e.x + e.r, e.y)
        }
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
        g.lineWidth = 8
        g.beginPath()
        const inner = e === mm.eyes[0] ? 1 : -1
        g.moveTo(e.x - e.r * 1.0 * inner, e.y - e.r * 1.45)
        g.lineTo(e.x + e.r * 0.9 * inner, e.y - e.r * 1.05)
        g.stroke()
      }
    }
    const ex = (mm.eyes[0].x + mm.eyes[mm.eyes.length - 1].x) / 2
    const ey = Math.max(...mm.eyes.map((e) => e.y)) + 70
    const eating = mo.eatT > t - 0.9
    g.fillStyle = '#7a2848'
    g.strokeStyle = '#3d3540'
    g.lineWidth = 7
    g.beginPath()
    if (eating) {
      const o = 30 + Math.abs(Math.sin((t - mo.eatT) * 14)) * 20
      g.ellipse(ex, ey, 42, o, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else if (!frozen && s.type === 'crouch' && s.big) {
      g.ellipse(ex, ey, 30, 24, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    } else {
      g.moveTo(ex - 30, ey - 6)
      g.quadraticCurveTo(ex - 15, ey + 10, ex, ey - 2)
      g.quadraticCurveTo(ex + 15, ey + 10, ex + 30, ey - 6)
      g.stroke()
    }
    if (frozen) {
      g.fillStyle = 'rgba(180,230,255,0.55)'
      g.strokeStyle = 'rgba(255,255,255,0.9)'
      g.lineWidth = 8
      g.beginPath()
      g.roundRect ? g.roundRect(-10, -10, mm.w + 20, mm.h + 20, 40) : g.rect(-10, -10, mm.w + 20, mm.h + 20)
      g.fill()
      g.stroke()
    }
    g.restore()
    if (!frozen && s.type === 'crouch' && s.big) {
      g.save()
      g.font = `${Math.round(64 * (0.6 + sc))}px Jua, sans-serif`
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
