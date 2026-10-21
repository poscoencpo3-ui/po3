import { useRef, useState } from 'react'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const PLACEHOLDER = isTouch ? '메시지 입력' : '메시지 입력 (Enter 전송 · Shift+Enter 줄바꿈 · Ctrl+V 캡쳐 붙여넣기)'

export default function Composer({ onSendText, onPickFiles }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  function resize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  async function send() {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setText('')
    requestAnimationFrame(() => inputRef.current && resize(inputRef.current))
    const ok = await onSendText(value)
    if (!ok) setText(value)
    setSending(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    // 한글 조합 중 Enter 는 무시해야 마지막 글자가 두 번 전송되지 않음
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="composer">
      <button className="icon-btn attach" onClick={() => fileRef.current.click()} title="사진 보내기" aria-label="사진 보내기">
        +
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onPickFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <textarea
        ref={inputRef}
        rows={1}
        value={text}
        placeholder={PLACEHOLDER}
        maxLength={5000}
        onChange={(e) => {
          setText(e.target.value)
          resize(e.target)
        }}
        onKeyDown={onKeyDown}
      />
      <button className="btn primary send" onClick={send} disabled={!text.trim() || sending}>
        전송
      </button>
    </div>
  )
}
