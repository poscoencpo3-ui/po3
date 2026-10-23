// 같은 씨앗(seed)이면 모든 폰에서 똑같이 나오는 난수 → 경주 때 괴물 움직임이 같아짐
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const lerp = (a, b, t) => a + (b - a) * t
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
export const easeOut = (t) => 1 - (1 - t) * (1 - t)
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
