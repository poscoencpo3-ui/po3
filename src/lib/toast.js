import { useEffect, useState } from 'react'

const listeners = new Set()

export function toast(message) {
  listeners.forEach((fn) => fn(message))
}

export function useToast() {
  const [message, setMessage] = useState(null)
  useEffect(() => {
    let timer
    const fn = (m) => {
      setMessage(m)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 2500)
    }
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
      clearTimeout(timer)
    }
  }, [])
  return message
}

export async function copyText(text, done = '복사했습니다.') {
  try {
    await navigator.clipboard.writeText(text)
    toast(done)
  } catch {
    window.prompt('아래 내용을 복사하세요 (Ctrl+C)', text)
  }
}
