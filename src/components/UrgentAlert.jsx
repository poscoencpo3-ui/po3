import { useEffect } from 'react'
import { formatTime, previewText } from '../lib/format'

const PATTERN = [700, 250, 700, 250, 700]

// 🚨 확인하지 않은 긴급·중요 메시지: 화면 전체가 빨갛게 깜빡이고, 휴대폰은 계속 진동. "확인"을 눌러야 닫힘
export default function UrgentAlert({ items, onAck }) {
  const msg = items[0]

  useEffect(() => {
    if (!('vibrate' in navigator)) return
    // 브라우저는 화면을 한 번이라도 누른 뒤에만 진동을 허용하므로, 누를 때마다 다시 울림
    const buzz = () => {
      if (!document.hidden) navigator.vibrate(PATTERN)
    }
    buzz()
    const timer = setInterval(buzz, 3000)
    document.addEventListener('pointerdown', buzz)
    document.addEventListener('visibilitychange', buzz)
    return () => {
      clearInterval(timer)
      document.removeEventListener('pointerdown', buzz)
      document.removeEventListener('visibilitychange', buzz)
      navigator.vibrate(0)
    }
  }, [])

  const content = msg.kind === 'text' ? msg.body : previewText(msg.kind, msg.kind === 'file' ? msg.file_name : msg.body)

  return (
    <div className="urgent-alert" role="alertdialog" aria-labelledby="urgent-head">
      <div className="urgent-card">
        <div className="urgent-head" id="urgent-head">
          🚨 긴급·중요 메시지
          {items.length > 1 && <span className="urgent-count"> (1/{items.length})</span>}
        </div>
        <div className="urgent-room">{msg.room_name}</div>
        <div className="urgent-from">
          <b>{msg.sender_name}</b>
          {msg.sender_company && <span> · {msg.sender_company}</span>}
          <span className="muted"> · {formatTime(msg.created_at)}</span>
        </div>
        <div className="urgent-body">{content}</div>
        <button className="btn urgent-ok" onClick={() => onAck(msg, false)}>
          ✅ 확인했습니다
        </button>
        <button className="btn ghost block" onClick={() => onAck(msg, true)}>
          확인하고 대화방으로 가기
        </button>
      </div>
    </div>
  )
}
