// 브라우저 저장소. 막혀 있는 환경(사생활 보호 모드, 미리보기 등)에서도 게임이 멈추지 않게 함
function safe(kind) {
  const mem = new Map()
  return {
    get(k) {
      try {
        return window[kind].getItem(k)
      } catch {
        return mem.has(k) ? mem.get(k) : null
      }
    },
    set(k, v) {
      mem.set(k, v)
      try {
        window[kind].setItem(k, v)
      } catch {
        // 저장 못 해도 이번 판은 계속
      }
    },
  }
}

export const local = safe('localStorage')
export const session = safe('sessionStorage')
