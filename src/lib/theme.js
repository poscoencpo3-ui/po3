import { useEffect, useState } from 'react'

// 채팅방 배경화면. 이 PC(브라우저)에만 저장되며 다른 사람에게는 영향 없음
const KEY = 'po3.bg'
const PHOTO_KEY = 'po3.bgPhoto'
const EVENT = 'po3-bg-change'

export const BACKGROUNDS = [
  { id: 'sky', name: '기본 하늘', css: '#b9cbdc' },
  { id: 'gray', name: '연회색', css: '#e6e9ed' },
  { id: 'mint', name: '민트', css: '#cde7e0' },
  { id: 'lavender', name: '라벤더', css: '#ddd7f2' },
  { id: 'peach', name: '피치', css: '#f5ded2' },
  { id: 'lemon', name: '레몬', css: '#f3edc8' },
  { id: 'grad-sky', name: '맑은 하늘', css: 'linear-gradient(165deg, #a9c3f5 0%, #dbe7fb 100%)' },
  { id: 'grad-sunset', name: '노을', css: 'linear-gradient(165deg, #f6c6de 0%, #b9c8f0 100%)' },
  { id: 'grad-forest', name: '숲', css: 'linear-gradient(165deg, #c6e8cf 0%, #94d1c6 100%)' },
  {
    id: 'blueprint',
    name: '도면',
    css: 'linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px) 0 0 / 22px 22px, #b8cfe6',
  },
  { id: 'dots', name: '도트', css: 'radial-gradient(rgba(60,74,92,.18) 1.5px, transparent 1.5px) 0 0 / 18px 18px, #e3e9f0' },
  { id: 'navy', name: '네이비 (어둡게)', css: '#2b3546', dark: true },
  { id: 'charcoal', name: '차콜 (어둡게)', css: '#2f3033', dark: true },
]

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function photo() {
  try {
    return localStorage.getItem(PHOTO_KEY)
  } catch {
    return null
  }
}

export function resolveBackground(roomId) {
  const saved = read()
  const id = (roomId && saved.rooms?.[roomId]) || saved.default || 'sky'
  if (id === 'photo') {
    const url = photo()
    if (url) return { id, css: `center / cover no-repeat url("${url}")`, photo: true }
  }
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0]
}

export function selectedBackgroundId(roomId, onlyRoom) {
  const saved = read()
  return (onlyRoom ? saved.rooms?.[roomId] : saved.default) || (onlyRoom ? null : 'sky')
}

// roomId 가 있으면 그 방에만, 없으면 모든 방 기본값으로 저장. id 가 null 이면 방별 설정 해제
export function saveBackground(id, roomId = null) {
  const saved = read()
  if (roomId) {
    saved.rooms = { ...(saved.rooms || {}) }
    if (id) saved.rooms[roomId] = id
    else delete saved.rooms[roomId]
  } else {
    saved.default = id
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(EVENT))
  return true
}

// 사진은 화면 크기에 맞게 줄여서 저장 (브라우저 저장 공간이 작음)
export async function savePhoto(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const url = canvas.toDataURL('image/jpeg', 0.8)
  try {
    localStorage.setItem(PHOTO_KEY, url)
    return true
  } catch {
    return false
  }
}

export function useBackground(roomId) {
  const [bg, setBg] = useState(() => resolveBackground(roomId))
  useEffect(() => {
    const update = () => setBg(resolveBackground(roomId))
    update()
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [roomId])
  return bg
}
