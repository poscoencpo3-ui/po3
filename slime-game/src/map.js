// 맵(아이 그림) 불러오기 + "여기 밟을 수 있나?" 판정
export const MAPS = [
  { id: 'saebom', name: '새봄이 맵', desc: '슬라임 숲 · 미끄럼틀 지름길' },
  { id: 'saebyeol', name: '새별이 맵', desc: '구름 하늘 · 사다리 지름길' },
]

const loadImg = (src) =>
  new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => rej(new Error('이미지를 못 불러왔어요: ' + src))
    im.src = src
  })

const cache = new Map()

export function loadMap(id) {
  if (!cache.has(id)) cache.set(id, build(id).catch((e) => (cache.delete(id), Promise.reject(e))))
  return cache.get(id)
}

async function build(id) {
  const base = `maps/${id}/`
  const meta = await (await fetch(base + 'map.json')).json()
  const [bg, monster, ...clouds] = await Promise.all([
    loadImg(base + meta.bg),
    loadImg(base + meta.monster.img),
    ...meta.clouds.map((c) => loadImg(base + c.img)),
  ])
  meta.bgImg = bg
  meta.monster.image = monster
  meta.clouds.forEach((c, i) => {
    c.image = clouds[i]
    // 밟기 판정용 투명도 지도
    const cv = document.createElement('canvas')
    cv.width = c.w
    cv.height = c.h
    const g = cv.getContext('2d', { willReadFrequently: true })
    g.drawImage(c.image, 0, 0)
    const data = g.getImageData(0, 0, c.w, c.h).data
    c.alpha = new Uint8Array(c.w * c.h)
    for (let k = 0; k < c.alpha.length; k++) c.alpha[k] = data[k * 4 + 3]
    // 그림자
    const sh = document.createElement('canvas')
    sh.width = c.w
    sh.height = c.h
    const sg = sh.getContext('2d')
    sg.drawImage(c.image, 0, 0)
    sg.globalCompositeOperation = 'source-in'
    sg.fillStyle = 'rgba(70,60,140,0.22)'
    sg.fillRect(0, 0, c.w, c.h)
    c.shadow = sh
    c.phase = (c.id * 1.7) % (Math.PI * 2)
  })
  meta.start = meta.clouds.find((c) => c.role === 'start')
  meta.goal = meta.clouds.find((c) => c.role === 'goal')
  return meta
}

// 구름이 시간에 따라 움직이는 양 (모든 폰에서 같은 시간 → 같은 위치)
export function cloudOffset(c, t) {
  let dx = 0
  let dy = Math.sin(t * 1.3 + c.phase) * 3
  if (c.drift) {
    const a = (t / c.drift.period) * Math.PI * 2
    dx += Math.sin(a) * c.drift.ax
    dy += Math.sin(a * (c.drift.ay && c.drift.ax ? 2 : 1)) * c.drift.ay
  }
  return [dx, dy]
}

function solidAt(c, lx, ly) {
  const x = Math.round(lx)
  const y = Math.round(ly)
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return false
  return c.alpha[y * c.w + x] > 90
}

// (x, y)를 밟을 수 있는 구름. 아이들용으로 가장자리는 조금 넉넉하게.
export function cloudAt(map, x, y, t, slack = 9) {
  let best = null
  for (const c of map.clouds) {
    const [dx, dy] = cloudOffset(c, t)
    const lx = x - c.x - dx
    const ly = y - c.y - dy
    if (lx < -slack || ly < -slack || lx > c.w + slack || ly > c.h + slack) continue
    if (solidAt(c, lx, ly)) return c
    if (!best) {
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2
        if (solidAt(c, lx + Math.cos(ang) * slack, ly + Math.sin(ang) * slack)) {
          best = c
          break
        }
      }
    }
  }
  return best
}
