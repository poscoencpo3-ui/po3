// 맵 배경: 봄이 맵 = 벚꽃 날리는 봄 하늘, 별이 맵 = 반짝이는 밤하늘
import { rng } from './rng.js'

function cloudPuff(g, x, y, s, color) {
  g.fillStyle = color
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

function blossomTree(g, x, y, s, flip) {
  g.save()
  g.translate(x, y)
  if (flip) g.scale(-1, 1)
  g.strokeStyle = '#a8746a'
  g.lineCap = 'round'
  g.lineWidth = s * 0.12
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.9, -s * 0.9)
  g.moveTo(s * 0.35, -s * 0.45)
  g.quadraticCurveTo(s * 0.7, -s * 0.3, s * 1.1, -s * 0.35)
  g.stroke()
  const r = rng(Math.round(x * 7 + y))
  for (let i = 0; i < 26; i++) {
    const bx = s * (0.4 + r() * 0.9)
    const by = -s * (0.2 + r() * 0.95)
    g.fillStyle = ['#ffc6dc', '#ffb0cf', '#ffd9e8', '#ff9fc4'][i % 4]
    g.beginPath()
    g.arc(bx, by, s * (0.1 + r() * 0.1), 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

function spring(map) {
  const { width: W, height: H } = map
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#9fdcff')
  sky.addColorStop(0.55, '#d6efff')
  sky.addColorStop(1, '#ffe2ef')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // 해님
  const sx = 120
  const sy = 120
  const glow = g.createRadialGradient(sx, sy, 20, sx, sy, 190)
  glow.addColorStop(0, 'rgba(255,240,170,0.9)')
  glow.addColorStop(1, 'rgba(255,240,170,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 400, 400)
  g.fillStyle = '#ffe27a'
  g.beginPath()
  g.arc(sx, sy, 58, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#6b4a3a'
  for (const s of [-1, 1]) {
    g.beginPath()
    g.arc(sx + s * 18, sy - 6, 5, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = '#6b4a3a'
  g.lineWidth = 4
  g.beginPath()
  g.arc(sx, sy + 6, 14, 0.15 * Math.PI, 0.85 * Math.PI)
  g.stroke()
  g.fillStyle = 'rgba(255,140,160,0.5)'
  for (const s of [-1, 1]) {
    g.beginPath()
    g.ellipse(sx + s * 34, sy + 12, 9, 6, 0, 0, Math.PI * 2)
    g.fill()
  }
  // 먼 구름
  const r = rng(11)
  for (let i = 0; i < 9; i++) cloudPuff(g, r() * W, 200 + r() * (H - 500), 30 + r() * 30, 'rgba(255,255,255,0.55)')
  // 언덕과 꽃
  const hill = (y, c) => {
    g.fillStyle = c
    g.beginPath()
    g.moveTo(0, H)
    for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x / 140) * 26 + Math.sin(x / 61) * 9)
    g.lineTo(W, H)
    g.closePath()
    g.fill()
  }
  hill(H - 120, '#bfeab0')
  hill(H - 60, '#a5df96')
  for (let i = 0; i < 60; i++) {
    const x = r() * W
    const y = H - 90 + r() * 80
    g.fillStyle = ['#fff', '#ffd1e3', '#fff0a0'][i % 3]
    g.beginPath()
    g.arc(x, y, 4 + r() * 3, 0, Math.PI * 2)
    g.fill()
  }
  blossomTree(g, -10, H - 70, 150, false)
  blossomTree(g, W + 10, 330, 130, true)
  return cv
}

function night(map) {
  const { width: W, height: H } = map
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#171042')
  sky.addColorStop(0.6, '#33236a')
  sky.addColorStop(1, '#6a4a92')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // 은하수
  const mw = g.createLinearGradient(0, H * 0.1, W, H * 0.7)
  mw.addColorStop(0, 'rgba(255,255,255,0)')
  mw.addColorStop(0.5, 'rgba(200,180,255,0.16)')
  mw.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = mw
  g.fillRect(0, 0, W, H)
  const r = rng(7)
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,250,230,${0.3 + r() * 0.6})`
    g.beginPath()
    g.arc(r() * W, r() * H, 0.8 + r() * 1.8, 0, Math.PI * 2)
    g.fill()
  }
  // 잠자는 초승달
  const mx = 140
  const my = 150
  const glow = g.createRadialGradient(mx, my, 30, mx, my, 170)
  glow.addColorStop(0, 'rgba(255,240,180,0.45)')
  glow.addColorStop(1, 'rgba(255,240,180,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 340, 340)
  g.fillStyle = '#fff1b0'
  g.beginPath()
  g.arc(mx, my, 62, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  g.arc(mx + 34, my - 18, 54, 0, Math.PI * 2)
  g.fill()
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = '#171042'
  g.fillStyle = '#5a4a3a'
  g.strokeStyle = '#5a4a3a'
  g.lineWidth = 3
  g.beginPath()
  g.arc(mx - 30, my + 6, 7, 0.1 * Math.PI, 0.9 * Math.PI)
  g.stroke()
  g.fillStyle = 'rgba(255,140,170,0.6)'
  g.beginPath()
  g.ellipse(mx - 38, my + 24, 8, 5, 0, 0, Math.PI * 2)
  g.fill()
  // 멀리 보이는 마을 불빛
  g.fillStyle = '#251a4d'
  g.beginPath()
  g.moveTo(0, H)
  for (let x = 0; x <= W; x += 30) g.lineTo(x, H - 70 + Math.sin(x / 90) * 18)
  g.lineTo(W, H)
  g.closePath()
  g.fill()
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 115 + r() * 30
    const h = 40 + r() * 40
    g.fillStyle = '#2d2058'
    g.fillRect(x, H - 60 - h, 44, h + 60)
    g.beginPath()
    g.moveTo(x - 6, H - 60 - h)
    g.lineTo(x + 22, H - 90 - h)
    g.lineTo(x + 50, H - 60 - h)
    g.fill()
    g.fillStyle = '#ffd979'
    g.fillRect(x + 10, H - 50 - h, 10, 12)
    if (r() > 0.4) g.fillRect(x + 25, H - 30 - h, 10, 12)
  }
  for (let i = 0; i < 6; i++) cloudPuff(g, r() * W, 300 + r() * (H - 600), 28 + r() * 26, 'rgba(160,140,220,0.18)')
  return cv
}

// 움직이는 배경 효과 (꽃잎·반짝이는 별·별똥별)
export class Scenery {
  constructor(map) {
    this.map = map
    this.theme = map.theme
    this.canvas = map.theme === 'night' ? night(map) : spring(map)
    const r = rng(5)
    this.bits = []
    const n = this.theme === 'night' ? 45 : 28
    for (let i = 0; i < n; i++) {
      this.bits.push({ x: r() * map.width, y: r() * map.height, s: 0.6 + r() * 0.8, p: r() * 10 })
    }
    this.shoot = null
  }

  draw(g, now, dt) {
    const { width: W, height: H } = this.map
    g.drawImage(this.canvas, 0, 0, W, H)
    if (this.theme === 'night') {
      for (const b of this.bits) {
        const a = 0.5 + 0.5 * Math.sin(now * 2.2 + b.p)
        g.fillStyle = `rgba(255,248,200,${a})`
        star(g, b.x, b.y, 7 * b.s * (0.6 + a * 0.4))
      }
      if (!this.shoot && Math.random() < dt * 0.25) this.shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.5, t: 0 }
      if (this.shoot) {
        const s = this.shoot
        s.t += dt
        const k = s.t / 0.9
        const x = s.x + k * 420
        const y = s.y + k * 200
        const grd = g.createLinearGradient(x - 120, y - 57, x, y)
        grd.addColorStop(0, 'rgba(255,255,255,0)')
        grd.addColorStop(1, `rgba(255,255,220,${1 - k})`)
        g.strokeStyle = grd
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(x - 120, y - 57)
        g.lineTo(x, y)
        g.stroke()
        if (k >= 1) this.shoot = null
      }
    } else {
      for (const b of this.bits) {
        b.y += dt * 40 * b.s
        b.x += Math.sin(now * 1.3 + b.p) * dt * 30
        if (b.y > H) {
          b.y = -10
          b.x = Math.random() * W
        }
        g.save()
        g.translate(b.x, b.y)
        g.rotate(now * b.s + b.p)
        g.fillStyle = 'rgba(255,170,205,0.85)'
        g.beginPath()
        g.ellipse(0, 0, 9 * b.s, 5 * b.s, 0, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
    }
  }
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
