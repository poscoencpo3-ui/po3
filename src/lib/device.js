// 휴대폰·태블릿: 손가락 화면이 기본이거나 휴대폰 브라우저인 경우 (일부 휴대폰은 pointer 판정이 안 맞음)
const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const mobileAgent = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
export const isTouch = coarse || mobileAgent
