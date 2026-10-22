// 귀여운 캐릭터 6종 (그림 파일 없이 캔버스로 그림)
export const CHARS = [
  { id: 'bunny', name: '토끼', body: '#fff4f8', dark: '#f3b6cc', cheek: '#ff9fbf' },
  { id: 'cat', name: '고양이', body: '#ffcf8a', dark: '#f0a24d', cheek: '#ff8f8f' },
  { id: 'chick', name: '병아리', body: '#ffeb6b', dark: '#f5c518', cheek: '#ffa07a' },
  { id: 'bear', name: '곰', body: '#c99a6e', dark: '#9c6f48', cheek: '#ff9f9f' },
  { id: 'frog', name: '개구리', body: '#9be37a', dark: '#5fb84a', cheek: '#ff9fb0' },
  { id: 'penguin', name: '펭귄', body: '#5b6bb5', dark: '#3d4a8c', cheek: '#ff9fbf' },
]

export const charById = (id) => CHARS.find((c) => c.id === id) || CHARS[0]

function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

/**
 * (x, y) = 발 위치. r = 몸 반지름.
 * o: { sx, sy (찌그러짐), rot, mood: 'idle'|'jump'|'scared'|'happy'|'dizzy', blink, look: -1..1 }
 */
export function drawChar(ctx, id, x, y, r, o = {}) {
  const c = charById(id)
  const sx = o.sx ?? 1
  const sy = o.sy ?? 1
  const mood = o.mood || 'idle'
  const look = o.look || 0
  ctx.save()
  ctx.translate(x, y)
  if (o.rot) ctx.rotate(o.rot)
  ctx.scale(sx, sy)
  ctx.translate(0, -r)
  ctx.lineWidth = r * 0.09
  const line = 'rgba(70,50,60,0.85)'

  // 발
  ellipse(ctx, -r * 0.45, r * 0.9, r * 0.28, r * 0.17, c.dark, line)
  ellipse(ctx, r * 0.45, r * 0.9, r * 0.28, r * 0.17, c.dark, line)

  // 귀 (몸보다 먼저)
  if (c.id === 'bunny') {
    const wig = mood === 'jump' ? -0.25 : 0
    for (const s of [-1, 1]) {
      ctx.save()
      ctx.rotate(s * (0.22 + wig))
      ellipse(ctx, s * r * 0.3, -r * 1.25, r * 0.24, r * 0.62, c.body, line)
      ellipse(ctx, s * r * 0.3, -r * 1.2, r * 0.11, r * 0.42, c.cheek)
      ctx.restore()
    }
  } else if (c.id === 'cat') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.85, -r * 0.35)
      ctx.lineTo(s * r * 0.7, -r * 1.15)
      ctx.lineTo(s * r * 0.2, -r * 0.8)
      ctx.closePath()
      ctx.fillStyle = c.body
      ctx.fill()
      ctx.strokeStyle = line
      ctx.stroke()
    }
  } else if (c.id === 'bear') {
    for (const s of [-1, 1]) {
      ellipse(ctx, s * r * 0.68, -r * 0.72, r * 0.3, r * 0.3, c.body, line)
      ellipse(ctx, s * r * 0.68, -r * 0.72, r * 0.15, r * 0.15, c.dark)
    }
  } else if (c.id === 'frog') {
    for (const s of [-1, 1]) ellipse(ctx, s * r * 0.45, -r * 0.82, r * 0.34, r * 0.32, c.body, line)
  } else if (c.id === 'chick') {
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.95)
    ctx.quadraticCurveTo(r * 0.1, -r * 1.45, r * 0.35, -r * 1.3)
    ctx.moveTo(0, -r * 0.95)
    ctx.quadraticCurveTo(-r * 0.25, -r * 1.4, -r * 0.05, -r * 1.45)
    ctx.strokeStyle = c.dark
    ctx.lineWidth = r * 0.14
    ctx.stroke()
    ctx.lineWidth = r * 0.09
  }

  // 날개 (o.wing: 0 접힘 ~ 1 활짝)
  if (o.wing !== undefined) {
    const w = o.wing
    for (const s of [-1, 1]) {
      ctx.save()
      ctx.translate(s * r * 0.8, -r * 0.1)
      ctx.rotate(s * (-0.3 - w * 1.0))
      ctx.beginPath()
      ctx.ellipse(s * r * 0.45, -r * 0.1, r * (0.42 + w * 0.2), r * 0.26, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = line
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(s * r * 0.2, -r * 0.05)
      ctx.lineTo(s * r * 0.65, -r * 0.08)
      ctx.moveTo(s * r * 0.25, r * 0.06)
      ctx.lineTo(s * r * 0.6, r * 0.06)
      ctx.strokeStyle = 'rgba(160,170,210,0.8)'
      ctx.lineWidth = r * 0.05
      ctx.stroke()
      ctx.lineWidth = r * 0.09
      ctx.restore()
    }
  }

  // 몸
  ellipse(ctx, 0, 0, r, r * 0.95, c.body, line)
  if (c.id === 'penguin') ellipse(ctx, 0, r * 0.18, r * 0.68, r * 0.7, '#ffffff')
  // 반짝이
  ellipse(ctx, -r * 0.42, -r * 0.48, r * 0.2, r * 0.13, 'rgba(255,255,255,0.75)')

  // 얼굴
  const fx = look * r * 0.18
  const ey = -r * 0.12
  ctx.fillStyle = '#3a2a33'
  ctx.strokeStyle = '#3a2a33'
  if (mood === 'happy') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(fx + s * r * 0.36, ey + r * 0.05, r * 0.15, Math.PI * 1.1, Math.PI * 1.9)
      ctx.lineWidth = r * 0.1
      ctx.stroke()
    }
  } else if (mood === 'scared' || mood === 'dizzy') {
    for (const s of [-1, 1]) {
      const ex = fx + s * r * 0.36
      ctx.lineWidth = r * 0.09
      ctx.beginPath()
      if (mood === 'scared') {
        ctx.moveTo(ex - s * r * 0.13, ey - r * 0.12)
        ctx.lineTo(ex + s * r * 0.1, ey)
        ctx.lineTo(ex - s * r * 0.13, ey + r * 0.12)
      } else {
        ctx.arc(ex, ey, r * 0.13, 0, Math.PI * 1.6)
      }
      ctx.stroke()
    }
  } else if (o.blink) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(fx + s * r * 0.36 - r * 0.12, ey)
      ctx.lineTo(fx + s * r * 0.36 + r * 0.12, ey)
      ctx.lineWidth = r * 0.08
      ctx.stroke()
    }
  } else {
    for (const s of [-1, 1]) {
      ellipse(ctx, fx + s * r * 0.36, ey, r * 0.13, r * 0.17, '#3a2a33')
      ellipse(ctx, fx + s * r * 0.36 + r * 0.04, ey - r * 0.07, r * 0.05, r * 0.06, '#fff')
    }
  }
  // 볼
  ellipse(ctx, fx - r * 0.6, ey + r * 0.25, r * 0.16, r * 0.1, c.cheek + 'cc')
  ellipse(ctx, fx + r * 0.6, ey + r * 0.25, r * 0.16, r * 0.1, c.cheek + 'cc')
  // 입
  ctx.lineWidth = r * 0.07
  if (c.id === 'chick' || c.id === 'penguin') {
    ctx.beginPath()
    ctx.moveTo(fx - r * 0.13, ey + r * 0.18)
    ctx.lineTo(fx + r * 0.13, ey + r * 0.18)
    ctx.lineTo(fx, ey + (mood === 'scared' || mood === 'jump' ? r * 0.42 : r * 0.33))
    ctx.closePath()
    ctx.fillStyle = '#ff9a3c'
    ctx.fill()
  } else if (mood === 'scared' || mood === 'jump') {
    ellipse(ctx, fx, ey + r * 0.3, r * 0.1, r * 0.13, '#c0405a')
  } else {
    ctx.beginPath()
    ctx.arc(fx - r * 0.08, ey + r * 0.2, r * 0.08, 0.1 * Math.PI, 0.9 * Math.PI)
    ctx.arc(fx + r * 0.08, ey + r * 0.2, r * 0.08, 0.1 * Math.PI, 0.9 * Math.PI)
    ctx.strokeStyle = '#3a2a33'
    ctx.stroke()
  }
  if (c.id === 'cat') {
    ctx.lineWidth = r * 0.04
    ctx.strokeStyle = 'rgba(70,50,60,0.6)'
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(fx + s * r * 0.55, ey + r * 0.3 + k * r * 0.05)
        ctx.lineTo(fx + s * r * 0.95, ey + r * 0.25 + k * r * 0.12)
        ctx.stroke()
      }
    }
  }
  if (o.hat) drawHat(ctx, o.hat, r, line)
  ctx.restore()
}

// 꾸미기 가게 물건 (별로 사요)
export const HATS = [
  { id: 'ribbon', name: '리본', price: 3 },
  { id: 'flower', name: '꽃핀', price: 6 },
  { id: 'party', name: '고깔모자', price: 8 },
  { id: 'cap', name: '야구모자', price: 10 },
  { id: 'glasses', name: '선글라스', price: 15 },
  { id: 'crown', name: '왕관', price: 20 },
  { id: 'wizard', name: '마법사 모자', price: 30 },
  { id: 'halo', name: '천사 링', price: 40 },
]

function drawHat(ctx, hat, r, line) {
  const top = -r * 0.92
  ctx.save()
  ctx.lineWidth = r * 0.08
  ctx.strokeStyle = line
  if (hat === 'ribbon') {
    ctx.translate(r * 0.45, top + r * 0.12)
    ctx.rotate(0.3)
    ctx.fillStyle = '#ff5c9a'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(s * r * 0.42, -r * 0.24)
      ctx.lineTo(s * r * 0.42, r * 0.24)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ellipse(ctx, 0, 0, r * 0.12, r * 0.12, '#ff8fbd', line)
  } else if (hat === 'flower') {
    ctx.translate(-r * 0.5, top + r * 0.18)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      ellipse(ctx, Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, r * 0.15, r * 0.15, '#ffd1e3', line)
    }
    ellipse(ctx, 0, 0, r * 0.12, r * 0.12, '#ffd84a', line)
  } else if (hat === 'cap') {
    ctx.fillStyle = '#ff5a5a'
    ctx.beginPath()
    ctx.arc(0, top + r * 0.3, r * 0.68, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(r * 0.55, top + r * 0.3, r * 0.5, r * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ellipse(ctx, 0, top - r * 0.38, r * 0.09, r * 0.09, '#fff', line)
  } else if (hat === 'crown') {
    ctx.fillStyle = '#ffd84a'
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, top + r * 0.15)
    ctx.lineTo(-r * 0.55, top - r * 0.45)
    ctx.lineTo(-r * 0.25, top - r * 0.15)
    ctx.lineTo(0, top - r * 0.6)
    ctx.lineTo(r * 0.25, top - r * 0.15)
    ctx.lineTo(r * 0.55, top - r * 0.45)
    ctx.lineTo(r * 0.5, top + r * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ellipse(ctx, 0, top - r * 0.05, r * 0.09, r * 0.09, '#ff5c9a')
    ellipse(ctx, -r * 0.3, top, r * 0.06, r * 0.06, '#5ad1ff')
    ellipse(ctx, r * 0.3, top, r * 0.06, r * 0.06, '#5ad1ff')
  } else if (hat === 'wizard') {
    ctx.fillStyle = '#7a5cff'
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, top + r * 0.2)
    ctx.quadraticCurveTo(-r * 0.1, top - r * 0.6, r * 0.25, top - r * 1.1)
    ctx.quadraticCurveTo(r * 0.2, top - r * 0.4, r * 0.6, top + r * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, top + r * 0.2, r * 0.75, r * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#ffe27a'
    for (const [x, y, k] of [
      [-r * 0.15, top - r * 0.15, 0.12],
      [r * 0.12, top - r * 0.5, 0.09],
    ]) {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        const rr = (i % 2 ? 0.45 : 1) * r * k
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      ctx.fill()
    }
  } else if (hat === 'party') {
    ctx.translate(-r * 0.15, top + r * 0.1)
    ctx.rotate(-0.25)
    ctx.beginPath()
    ctx.moveTo(-r * 0.32, 0)
    ctx.lineTo(0, -r * 0.85)
    ctx.lineTo(r * 0.32, 0)
    ctx.closePath()
    ctx.fillStyle = '#5ad1ff'
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = '#ffe27a'
    for (let i = 0; i < 4; i++) ctx.fillRect(-r, -r * (0.15 + i * 0.22), r * 2, r * 0.09)
    ctx.restore()
    ctx.stroke()
    ellipse(ctx, 0, -r * 0.88, r * 0.1, r * 0.1, '#ff5c9a', line)
  } else if (hat === 'glasses') {
    const ey = -r * 0.12
    ctx.fillStyle = 'rgba(40,30,60,0.9)'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(s * r * 0.36, ey, r * 0.24, r * 0.19, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ellipse(ctx, s * r * 0.36 - r * 0.08, ey - r * 0.06, r * 0.06, r * 0.04, 'rgba(255,255,255,0.8)')
    }
    ctx.beginPath()
    ctx.moveTo(-r * 0.12, ey - r * 0.04)
    ctx.quadraticCurveTo(0, ey - r * 0.12, r * 0.12, ey - r * 0.04)
    ctx.stroke()
  } else if (hat === 'halo') {
    ctx.strokeStyle = '#ffd84a'
    ctx.lineWidth = r * 0.14
    ctx.shadowColor = 'rgba(255,230,120,0.9)'
    ctx.shadowBlur = r * 0.4
    ctx.beginPath()
    ctx.ellipse(0, top - r * 0.45, r * 0.5, r * 0.15, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

// 고르기 화면용 작은 그림
export function charIcon(id, size = 72, hat = null) {
  const cv = document.createElement('canvas')
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  cv.width = cv.height = size * dpr
  cv.style.width = cv.style.height = size + 'px'
  const g = cv.getContext('2d')
  g.scale(dpr, dpr)
  drawChar(g, id, size / 2, size * 0.92, size * (hat ? 0.27 : 0.3), { hat })
  return cv
}
