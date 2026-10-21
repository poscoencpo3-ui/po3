import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../lib/format'
import { getCachedImageUrl, getImageUrl } from '../lib/imageUrls'
import Avatar from './Avatar'

const URL_RE = /(https?:\/\/[^\s]+)/g

function Linkified({ text }) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer noopener">
        {part}
      </a>
    ) : (
      part
    )
  )
}

export function ImageThumb({ msg, onOpen, onLoad, maxWidth = 240 }) {
  const [url, setUrl] = useState(() => (msg.image_expired ? null : getCachedImageUrl(msg.image_path)))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (msg.image_expired || url) return
    let alive = true
    getImageUrl(msg.image_path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [msg.image_path, msg.image_expired, url])

  if (msg.image_expired) return <div className="image-expired">보관 기간(90일)이 지나 삭제된 사진입니다</div>
  if (failed) return <div className="image-expired">사진을 불러오지 못했습니다</div>

  const w = msg.image_width || 240
  const h = msg.image_height || 180
  const width = Math.min(maxWidth, w)
  return (
    <button className="image-thumb" style={{ width, aspectRatio: `${w} / ${h}` }} onClick={onOpen}>
      {url && <img src={url} alt="사진" onLoad={onLoad} draggable={false} />}
    </button>
  )
}

export default function MessageItem({ msg, mine, member, showSender, showTime, unread, isNotice, onOpenImage, onMediaLoad, onMenu }) {
  const pressTimer = useRef(null)

  if (msg.kind === 'system') {
    return <div className="system-msg">{msg.body}</div>
  }

  const name = msg.sender_name || member?.display_name || '(알 수 없음)'
  const company = msg.sender_company ?? member?.company

  const menuHandlers = {
    onContextMenu: (e) => {
      e.preventDefault()
      onMenu(e.clientX, e.clientY)
    },
    onTouchStart: (e) => {
      const t = e.touches[0]
      pressTimer.current = setTimeout(() => onMenu(t.clientX, t.clientY), 550)
    },
    onTouchEnd: () => clearTimeout(pressTimer.current),
    onTouchMove: () => clearTimeout(pressTimer.current),
  }

  const meta = (
    <div className="msg-meta">
      {unread > 0 && <span className="unread">{unread}</span>}
      {showTime && <span className="time">{formatTime(msg.created_at)}</span>}
    </div>
  )

  const bubble =
    msg.kind === 'image' ? (
      <div className={'bubble image' + (isNotice ? ' notice' : '')} {...menuHandlers}>
        <ImageThumb msg={msg} onOpen={onOpenImage} onLoad={onMediaLoad} />
      </div>
    ) : (
      <div className={'bubble text' + (isNotice ? ' notice' : '')} {...menuHandlers}>
        <Linkified text={msg.body} />
      </div>
    )

  if (mine) {
    return (
      <div className={'msg-row mine' + (showSender ? ' group-start' : '')}>
        {meta}
        {bubble}
      </div>
    )
  }

  return (
    <div className={'msg-row other' + (showSender ? ' group-start' : '')}>
      <div className="avatar-slot">{showSender && <Avatar name={name} seed={msg.user_id} />}</div>
      <div className="msg-body">
        {showSender && (
          <div className="sender">
            {name}
            {company && <span className="company"> · {company}</span>}
            {member?.is_admin && <span className="admin-tag">관리자</span>}
          </div>
        )}
        <div className="msg-line">
          {bubble}
          {meta}
        </div>
      </div>
    </div>
  )
}
