// 무대 배경: 봄이 무대(꽃잎·바람·동물 친구들) / 별이 무대(우주)
import { drawChar } from './chars.js'
import { rng } from './rng.js'

export const THEMES = {
  spring: { name: '봄이 무대', desc: '꽃잎 날리는 봄 동산' },
  space: { name: '별이 무대', desc: '별똥별 반짝 우주' },
}

export function star(g, x, y, r) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
}

function face(g, x, y, s, sleepy) {
  g.fillStyle = '#6b4a3a'
  g.strokeStyle = '#6b4a3a'
  g.lineWidth = s * 0.08
  for (const d of [-1, 1]) {
    g.beginPath()
    if (sleepy) g.arc(x + d * s * 0.3, y - s * 0.05, s * 0.12, 0.1 * Math.PI, 0.9 * Math.PI)
    else g.arc(x + d * s * 0.3, y - s * 0.08, s * 0.08, 0, Math.PI * 2)
    sleepy ? g.stroke() : g.fill()
  }
  g.beginPath()
  g.arc(x, y + s * 0.08, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
  g.fillStyle = 'rgba(255,140,160,0.55)'
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * s * 0.55, y + s * 0.12, s * 0.14, s * 0.09, 0, 0, Math.PI * 2)
    g.fill()
  }
}

function puff(g, x, y, s, c) {
  g.fillStyle = c
  for (const [dx, dy, r] of [
    [0, 0, 1],
    [-0.9, 0.25, 0.7],
    [0.9, 0.25, 0.75],
    [-0.4, -0.35, 0.7],
    [0.45, -0.3, 0.65],
  ]) {
    g.beginPath()
    g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
    g.fill()
  }
}

export class Scene {
  constructor(theme) {
    this.theme = theme
    const r = rng(theme === 'space' ? 9 : 4)
    this.bits = Array.from({ length: theme === 'space' ? 90 : 34 }, () => ({ x: r(), y: r(), s: 0.5 + r(), p: r() * 10 }))
    this.clouds = Array.from({ length: 5 }, () => ({ x: r(), y: 0.08 + r() * 0.5, s: 0.6 + r() * 0.8 }))
    this.flies = Array.from({ length: 3 }, (_, i) => ({ x: r(), y: 0.2 + r() * 0.5, p: i * 2 }))
    this.wind = 0
    this.gust = 0
    this.shoot = null
    this.ufo = null
    this.cheer = -9
    this.fans =
      theme === 'space'
        ? [
            { kind: 'alien', c: '#8ff0a8' },
            { kind: 'alien', c: '#ffb3e6' },
            { kind: 'planet', c: '#ffd36b' },
            { kind: 'alien', c: '#9fd4ff' },
            { kind: 'planet', c: '#c4a8ff' },
          ]
        : [
            { kind: 'bunny' },
            { kind: 'puppy' },
            { kind: 'chick' },
            { kind: 'cat' },
            { kind: 'bunny' },
          ]
  }

  // 콤보 축하 → 관중이 신나서 점프
  celebrate(t) {
    this.cheer = t
    if (this.theme === 'space' && !this.ufo) this.ufo = { t0: t }
  }

  drawSky(g, w, h, t, dt) {
    if (this.theme === 'space') return this.space(g, w, h, t, dt)
    return this.spring(g, w, h, t, dt)
  }

  spring(g, w, h, t, dt) {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#a6deff')
    sky.addColorStop(0.6, '#dff3ff')
    sky.addColorStop(1, '#ffe6f1')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    // 해님
    const sx = w - 58
    const sy = 92
    const glow = g.createRadialGradient(sx, sy, 10, sx, sy, 110)
    glow.addColorStop(0, 'rgba(255,236,150,0.9)')
    glow.addColorStop(1, 'rgba(255,236,150,0)')
    g.fillStyle = glow
    g.fillRect(sx - 120, sy - 120, 240, 240)
    g.save()
    g.translate(sx, sy)
    g.rotate(t * 0.3)
    g.strokeStyle = 'rgba(255,214,90,0.8)'
    g.lineWidth = 4
    g.lineCap = 'round'
    for (let i = 0; i < 10; i++) {
      g.rotate(Math.PI / 5)
      g.beginPath()
      g.moveTo(0, 40)
      g.lineTo(0, 52)
      g.stroke()
    }
    g.restore()
    g.fillStyle = '#ffe27a'
    g.beginPath()
    g.arc(sx, sy, 32, 0, Math.PI * 2)
    g.fill()
    face(g, sx, sy, 30, false)
    // 바람: 천천히 바뀌고 가끔 휙
    this.gust = Math.max(0, this.gust - dt * 0.5)
    if (Math.random() < dt * 0.12) this.gust = 1
    this.wind = Math.sin(t * 0.4) * 30 + this.gust * 140
    for (const c of this.clouds) {
      c.x += (dt * (6 + this.wind * 0.08) * c.s) / w
      if (c.x > 1.2) c.x = -0.2
      puff(g, c.x * w, c.y * h, 22 * c.s, 'rgba(255,255,255,0.75)')
    }
    // 바람 소용돌이 선
    if (this.gust > 0.2) {
      g.strokeStyle = `rgba(255,255,255,${this.gust * 0.7})`
      g.lineWidth = 3
      g.lineCap = 'round'
      for (let i = 0; i < 3; i++) {
        const y = h * (0.25 + i * 0.18)
        const x = ((t * 260 + i * 140) % (w + 200)) - 100
        g.beginPath()
        g.moveTo(x - 60, y)
        g.quadraticCurveTo(x, y - 18, x + 30, y)
        g.arc(x + 30, y - 10, 10, Math.PI / 2, -Math.PI, true)
        g.stroke()
      }
    }
    // 꽃잎
    for (const b of this.bits) {
      b.y += (dt * (30 + 25 * b.s)) / h
      b.x += (dt * (this.wind + Math.sin(t * 2 + b.p) * 30)) / w
      if (b.y > 1.02) {
        b.y = -0.02
        b.x = Math.random()
      }
      if (b.x > 1.05) b.x = -0.05
      if (b.x < -0.05) b.x = 1.05
      g.save()
      g.translate(b.x * w, b.y * h)
      g.rotate(t * (1 + b.s) + b.p)
      g.fillStyle = b.p > 5 ? 'rgba(255,160,200,0.9)' : 'rgba(255,205,225,0.95)'
      g.beginPath()
      g.ellipse(0, 0, 7 * b.s, 4 * b.s, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    // 나비
    for (const f of this.flies) {
      f.x += (dt * (25 + this.wind * 0.3)) / w
      if (f.x > 1.1) f.x = -0.1
      const x = f.x * w
      const y = f.y * h + Math.sin(t * 2 + f.p) * 18
      const flap = Math.abs(Math.sin(t * 14 + f.p))
      g.fillStyle = ['#ffb3d1', '#fff08a', '#c7b3ff'][f.p / 2]
      for (const s of [-1, 1]) {
        g.beginPath()
        g.ellipse(x + s * 7 * flap, y, 8 * flap + 1, 10, s * 0.4, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#6b4a3a'
      g.fillRect(x - 1.5, y - 7, 3, 14)
    }
  }

  space(g, w, h, t, dt) {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0c0930')
    sky.addColorStop(0.55, '#24185c')
    sky.addColorStop(1, '#4b2f86')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    // 성운
    for (const [x, y, r, c] of [
      [0.2, 0.35, 0.35, 'rgba(255,120,200,0.12)'],
      [0.8, 0.55, 0.4, 'rgba(120,180,255,0.12)'],
    ]) {
      const gr = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w)
      gr.addColorStop(0, c)
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
    }
    for (const b of this.bits) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + b.p))
      g.fillStyle = `rgba(255,250,220,${a})`
      if (b.s > 1.2) star(g, b.x * w, b.y * h, 4 * b.s)
      else {
        g.beginPath()
        g.arc(b.x * w, b.y * h, 1.2 * b.s, 0, Math.PI * 2)
        g.fill()
      }
    }
    // 달님 (자는 얼굴)
    const mx = 56
    const my = 96
    const mg = g.createRadialGradient(mx, my, 10, mx, my, 90)
    mg.addColorStop(0, 'rgba(255,240,180,0.4)')
    mg.addColorStop(1, 'rgba(255,240,180,0)')
    g.fillStyle = mg
    g.fillRect(mx - 90, my - 90, 180, 180)
    g.fillStyle = '#fff1b0'
    g.beginPath()
    g.arc(mx, my, 30, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(230,210,140,0.6)'
    for (const [dx, dy, r] of [
      [-10, -12, 5],
      [12, 8, 4],
      [-4, 14, 3],
    ]) {
      g.beginPath()
      g.arc(mx + dx, my + dy, r, 0, Math.PI * 2)
      g.fill()
    }
    face(g, mx, my + 2, 24, true)
    // 해님 (멀리서 반짝)
    const sx = w - 46
    const sy = 70
    const sg = g.createRadialGradient(sx, sy, 6, sx, sy, 70)
    sg.addColorStop(0, 'rgba(255,200,90,0.85)')
    sg.addColorStop(1, 'rgba(255,200,90,0)')
    g.fillStyle = sg
    g.fillRect(sx - 70, sy - 70, 140, 140)
    g.fillStyle = '#ffc94a'
    g.beginPath()
    g.arc(sx, sy, 20, 0, Math.PI * 2)
    g.fill()
    face(g, sx, sy, 18, false)
    // 고리 행성
    const px = w * 0.16
    const py = h * 0.48 + Math.sin(t * 0.5) * 6
    g.save()
    g.translate(px, py)
    g.rotate(-0.3)
    g.strokeStyle = 'rgba(255,220,160,0.8)'
    g.lineWidth = 4
    g.beginPath()
    g.ellipse(0, 0, 36, 10, 0, Math.PI, Math.PI * 2)
    g.stroke()
    g.fillStyle = '#ff9ec7'
    g.beginPath()
    g.arc(0, 0, 20, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.ellipse(0, 0, 36, 10, 0, 0, Math.PI)
    g.stroke()
    g.restore()
    // 별똥별
    if (!this.shoot && Math.random() < dt * 0.4) this.shoot = { x: Math.random() * w * 0.8, y: Math.random() * h * 0.4, t: 0 }
    if (this.shoot) {
      const s = this.shoot
      s.t += dt
      const k = s.t / 0.8
      const x = s.x + k * 320
      const y = s.y + k * 150
      const grd = g.createLinearGradient(x - 110, y - 52, x, y)
      grd.addColorStop(0, 'rgba(255,255,255,0)')
      grd.addColorStop(1, `rgba(255,255,220,${1 - k})`)
      g.strokeStyle = grd
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(x - 110, y - 52)
      g.lineTo(x, y)
      g.stroke()
      g.fillStyle = `rgba(255,255,230,${1 - k})`
      star(g, x, y, 6)
      if (k >= 1) this.shoot = null
    }
    // UFO (콤보 축하 때 지나감)
    if (this.ufo) {
      const k = (t - this.ufo.t0) / 4
      if (k > 1) this.ufo = null
      else {
        const x = -60 + k * (w + 120)
        const y = h * 0.22 + Math.sin(k * 20) * 10
        g.fillStyle = 'rgba(160,255,200,0.25)'
        g.beginPath()
        g.moveTo(x - 14, y + 6)
        g.lineTo(x + 14, y + 6)
        g.lineTo(x + 30, y + 60)
        g.lineTo(x - 30, y + 60)
        g.fill()
        g.fillStyle = '#b8f5ff'
        g.beginPath()
        g.arc(x, y - 4, 12, Math.PI, 0)
        g.fill()
        g.fillStyle = '#8ff0a8'
        g.beginPath()
        g.arc(x, y - 4, 6, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#c4a8ff'
        g.beginPath()
        g.ellipse(x, y + 2, 30, 9, 0, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fff36b'
        for (const d of [-18, 0, 18]) {
          g.beginPath()
          g.arc(x + d, y + 3, 2.5, 0, Math.PI * 2)
          g.fill()
        }
      }
    }
  }

  // 아래쪽 달리기 트랙 + 관중
  drawTrack(g, x0, y0, w, h, t, scroll) {
    const space = this.theme === 'space'
    // 관중석 띠
    const fanH = Math.min(46, h * 0.3)
    g.fillStyle = space ? '#2a1d63' : '#bfeab0'
    g.fillRect(x0, y0, w, h)
    if (!space) {
      g.fillStyle = '#a5df96'
      g.beginPath()
      g.moveTo(x0, y0 + fanH)
      for (let x = 0; x <= w; x += 20) g.lineTo(x0 + x, y0 + fanH * 0.55 + Math.sin((x + scroll * 0.3) / 40) * 5)
      g.lineTo(x0 + w, y0 + fanH)
      g.fill()
      for (let i = 0; i < 14; i++) {
        const fx = ((i * 73 - scroll * 0.5) % (w + 40) + w + 40) % (w + 40) - 20
        g.fillStyle = ['#fff', '#ffd1e3', '#fff0a0'][i % 3]
        g.beginPath()
        g.arc(x0 + fx, y0 + fanH * 0.8 + (i % 3) * 3, 3.5, 0, Math.PI * 2)
        g.fill()
      }
    } else {
      for (let i = 0; i < 18; i++) {
        const fx = ((i * 61 - scroll * 0.3) % (w + 30) + w + 30) % (w + 30) - 15
        g.fillStyle = `rgba(255,250,220,${0.3 + (i % 4) * 0.15})`
        star(g, x0 + fx, y0 + 6 + (i % 5) * 7, 2.5)
      }
    }
    const cheering = t - this.cheer < 1.4
    this.fans.forEach((f, i) => {
      const fx = x0 + (w * (i + 0.5)) / this.fans.length
      const jump = cheering ? Math.abs(Math.sin(t * 9 + i)) * 16 : Math.abs(Math.sin(t * 3 + i * 1.3)) * 5
      const fy = y0 + fanH - 4 - jump
      const s = fanH * 0.32
      if (f.kind === 'alien') {
        g.fillStyle = f.c
        g.beginPath()
        g.ellipse(fx, fy - s, s, s * 1.05, 0, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = f.c
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(fx - s * 0.4, fy - s * 1.9)
        g.lineTo(fx - s * 0.5, fy - s * 2.5)
        g.moveTo(fx + s * 0.4, fy - s * 1.9)
        g.lineTo(fx + s * 0.5, fy - s * 2.5)
        g.stroke()
        g.fillStyle = '#fff36b'
        g.beginPath()
        g.arc(fx - s * 0.5, fy - s * 2.55, 2.5, 0, Math.PI * 2)
        g.arc(fx + s * 0.5, fy - s * 2.55, 2.5, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fff'
        g.beginPath()
        g.arc(fx, fy - s * 1.1, s * 0.42, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#2b2230'
        g.beginPath()
        g.arc(fx, fy - s * 1.05, s * 0.22, 0, Math.PI * 2)
        g.fill()
      } else if (f.kind === 'planet') {
        g.fillStyle = f.c
        g.beginPath()
        g.arc(fx, fy - s, s, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = 'rgba(255,255,255,0.7)'
        g.lineWidth = 2
        g.beginPath()
        g.ellipse(fx, fy - s, s * 1.6, s * 0.4, -0.2, 0, Math.PI * 2)
        g.stroke()
        face(g, fx, fy - s, s * 0.9, false)
      } else {
        drawChar(g, f.kind, fx, fy, s, { mood: cheering ? 'happy' : 'idle', blink: (t + i) % 3 < 0.1 })
      }
      if (cheering && i % 2 === 0) {
        g.fillStyle = space ? '#fff36b' : '#ff7eb3'
        g.font = `${Math.round(s * 1.2)}px sans-serif`
        g.textAlign = 'center'
        g.fillText(space ? '✨' : '♥', fx + s, fy - s * 2.6 - jump * 0.3)
      }
    })
    return y0 + fanH
  }
}
