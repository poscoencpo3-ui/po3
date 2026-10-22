// 슬라임 괴물의 움직임 계획표. 씨앗과 시간만으로 정해지므로
// 경주하는 모든 폰에서 괴물이 똑같이 움직임.
import { rng, dist, lerp, easeInOut } from './rng.js'

const REST_FIRST = 1.5 // 출발 후 처음엔 쉬고 있음

export function planMonster(map, seed) {
  const r = rng(seed)
  const start = map.start
  const goal = map.goal
  const spots = map.clouds
    .filter((c) => !c.role)
    .map((c) => [c.cx, c.cy])
    .filter(([x, y]) => dist(x, y, start.cx, start.cy) > 190 && dist(x, y, goal.cx, goal.cy) > 150)
  spots.push(map.monster.home)
  // 출발→도착 길목에 가까운 곳을 더 자주 노림
  const [ax, ay, bx, by] = [start.cx, start.cy, goal.cx, goal.cy]
  const L = dist(ax, ay, bx, by)
  const weight = ([x, y]) => {
    const d = Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / L
    return 1 + 2.5 * Math.exp(-((d / 170) ** 2))
  }
  const choose = (list) => {
    const ws = list.map(weight)
    let k = r() * ws.reduce((a, b) => a + b, 0)
    for (let i = 0; i < list.length; i++) if ((k -= ws[i]) <= 0) return list[i]
    return list[list.length - 1]
  }

  const segs = []
  let [x, y] = map.monster.home
  let t = 0
  segs.push({ type: 'rest', t0: 0, t1: REST_FIRST, x0: x, y0: y, x1: x, y1: y })
  t = REST_FIRST
  let hop = 0
  while (t < 900) {
    hop++
    const big = hop % 5 === 0 || r() < 0.12
    const cands = spots.filter(([sx, sy]) => {
      const d = dist(x, y, sx, sy)
      return big ? d > 300 && d < 750 : d > 90 && d < 360
    })
    const pool = cands.length ? cands : spots
    const [nx, ny] = choose(pool)
    const crouch = big ? 0.7 : 0.25
    const air = big ? 1.25 : 0.55 + r() * 0.3
    segs.push({ type: 'crouch', big, t0: t, t1: t + crouch, x0: x, y0: y, x1: x, y1: y })
    t += crouch
    segs.push({ type: 'air', big, t0: t, t1: t + air, x0: x, y0: y, x1: nx, y1: ny, h: big ? 260 : 90 + r() * 50 })
    t += air
    const rest = big ? 1.3 + r() * 0.6 : 0.7 + r() * 1.1
    segs.push({ type: 'rest', land: true, big, t0: t, t1: t + rest, x0: nx, y0: ny, x1: nx, y1: ny })
    t += rest
    x = nx
    y = ny
  }
  return segs
}

let lastIdx = 0
export function monsterAt(segs, t) {
  if (t < 0) t = 0
  let i = lastIdx < segs.length && segs[lastIdx].t0 <= t ? lastIdx : 0
  while (i < segs.length - 1 && segs[i].t1 <= t) i++
  lastIdx = i
  const s = segs[i]
  const p = Math.min(1, (t - s.t0) / (s.t1 - s.t0))
  if (s.type === 'air') {
    const e = easeInOut(p)
    return {
      seg: s,
      p,
      x: lerp(s.x0, s.x1, e),
      y: lerp(s.y0, s.y1, e),
      z: Math.sin(p * Math.PI) * s.h,
      gx: s.x1,
      gy: s.y1,
    }
  }
  return { seg: s, p, x: s.x0, y: s.y0, z: 0 }
}
