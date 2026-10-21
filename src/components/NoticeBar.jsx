import { useState } from 'react'
import { formatDay } from '../lib/format'

export default function NoticeBar({ notice, isAdmin, onOpenImage, onClear }) {
  const [open, setOpen] = useState(false)
  const isImage = notice.kind === 'image'
  return (
    <div className={'notice-bar' + (open ? ' open' : '')}>
      <span className="notice-icon">📢</span>
      <div className="notice-content" onClick={() => (isImage ? onOpenImage() : setOpen(!open))}>
        <div className="notice-text">{isImage ? '[사진] 눌러서 보기' : notice.body}</div>
        {open && (
          <div className="muted small">
            {notice.sender_name} · {formatDay(notice.created_at)}
          </div>
        )}
      </div>
      {isAdmin && (
        <button className="btn small ghost" onClick={onClear} title="공지 해제">
          해제
        </button>
      )}
    </div>
  )
}
