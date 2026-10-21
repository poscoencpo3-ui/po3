import { useEffect, useRef, useState } from 'react'
import { formatBytes, formatTime, isEmojiOnly, REPORT_FIELDS } from '../lib/format'
import { getCachedImageUrl, getImageUrl } from '../lib/imageUrls'
import { fileIcon } from '../lib/files'
import Avatar from './Avatar'

const URL_RE = /(https?:\/\/[^\s]+)/g
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 링크와 @멘션을 표시
function RichText({ text, mentionNames }) {
  const mentionRe = mentionNames.length ? new RegExp(`(@(?:${mentionNames.map(escapeRe).join('|')}))`, 'g') : null
  return text.split(URL_RE).map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer noopener">
          {part}
        </a>
      )
    }
    if (!mentionRe) return part
    return part.split(mentionRe).map((p, j) =>
      j % 2 === 1 ? (
        <span key={`${i}-${j}`} className="mention">
          {p}
        </span>
      ) : (
        p
      )
    )
  })
}

export function ImageThumb({ msg, onOpen, onLoad, maxWidth = 240, square = false }) {
  const [url, setUrl] = useState(() => (msg.image_expired ? null : getCachedImageUrl(msg.image_path)))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (msg.image_expired || url || !msg.image_path) return
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
  const style = square ? { width: '100%', aspectRatio: '1' } : { width: Math.min(maxWidth, w), aspectRatio: `${w} / ${h}` }
  return (
    <button className="image-thumb" style={style} onClick={onOpen}>
      {url && <img src={url} alt="사진" onLoad={onLoad} draggable={false} />}
    </button>
  )
}

function ReplyQuote({ msg, onJump }) {
  const snap = msg.reply_snapshot
  if (!snap) return null
  return (
    <button className="reply-quote" onClick={() => onJump(msg.reply_to)}>
      {snap.deleted ? (
        <span className="muted">삭제된 메시지</span>
      ) : (
        <>
          <strong>{snap.sender_name}</strong>
          <span>{snap.kind === 'image' ? '사진' : snap.kind === 'file' ? `파일: ${snap.body}` : snap.kind === 'report' ? '📝 작업일보' : snap.body}</span>
        </>
      )}
    </button>
  )
}

function FileCard({ msg, onDownload }) {
  if (msg.image_expired) return <div className="image-expired">보관 기간(90일)이 지나 삭제된 파일입니다</div>
  return (
    <button className="file-card" onClick={onDownload}>
      <span className="file-icon">{fileIcon(msg.file_name)}</span>
      <span className="file-info">
        <span className="file-name">{msg.file_name}</span>
        <span className="muted small">{formatBytes(msg.file_size)} · 눌러서 저장</span>
      </span>
    </button>
  )
}

function ReportCard({ data }) {
  return (
    <div className="report-card">
      <div className="report-title">📝 작업일보</div>
      <table>
        <tbody>
          {REPORT_FIELDS.filter((f) => data?.[f.key]).map((f) => (
            <tr key={f.key}>
              <th>{f.label}</th>
              <td>{data[f.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MessageItem({
  msg,
  mine,
  member,
  colors,
  showSender,
  showTime,
  unread,
  isNotice,
  highlighted,
  mentionNames,
  mentionsMe,
  onOpenImage,
  onMediaLoad,
  onMenu,
  onJump,
  onDownload,
}) {
  const pressTimer = useRef(null)

  if (msg.kind === 'system') {
    return <div className="system-msg">{msg.body}</div>
  }

  const name = msg.sender_name || member?.display_name || '(알 수 없음)'
  const company = msg.sender_company ?? member?.company
  const deleted = Boolean(msg.deleted_at)
  const bigEmoji = !deleted && msg.kind === 'text' && !msg.reply_snapshot && !msg.is_urgent && isEmojiOnly(msg.body)

  const menuHandlers = {
    onContextMenu: (e) => {
      e.preventDefault()
      onMenu(e.clientX, e.clientY)
    },
    onTouchStart: (e) => {
      const t = e.touches[0]
      pressTimer.current = setTimeout(() => onMenu(t.clientX, t.clientY), 500)
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

  let content
  if (deleted) {
    content = <span className="deleted-text">{msg.deleted_by && msg.deleted_by !== msg.user_id ? '관리자가 삭제한 메시지입니다' : '삭제된 메시지입니다'}</span>
  } else if (msg.kind === 'image') {
    content = <ImageThumb msg={msg} onOpen={onOpenImage} onLoad={onMediaLoad} />
  } else if (msg.kind === 'file') {
    content = <FileCard msg={msg} onDownload={onDownload} />
  } else if (msg.kind === 'report') {
    content = <ReportCard data={msg.data} />
  } else {
    content = <RichText text={msg.body} mentionNames={mentionNames} />
  }

  const classes = [
    'bubble',
    bigEmoji ? 'emoji-only' : msg.kind === 'image' && !deleted && !msg.reply_snapshot ? 'image' : 'text',
    msg.kind === 'file' || msg.kind === 'report' ? 'card' : '',
    deleted ? 'deleted' : '',
    msg.is_urgent && !deleted ? 'urgent' : '',
    isNotice ? 'notice' : '',
    mentionsMe ? 'mentions-me' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const bubbleStyle = !mine && colors && !bigEmoji && !msg.is_urgent && !deleted ? { background: colors[0] } : undefined

  const bubble = (
    <div className={classes} style={bubbleStyle} {...(deleted ? {} : menuHandlers)}>
      {msg.is_urgent && !deleted && <div className="urgent-label">🚨 긴급</div>}
      {!deleted && <ReplyQuote msg={msg} onJump={onJump} />}
      {content}
    </div>
  )

  const rowClass = `msg-row ${mine ? 'mine' : 'other'}${showSender ? ' group-start' : ''}${highlighted ? ' flash' : ''}`

  if (mine) {
    return (
      <div className={rowClass} data-id={msg.id}>
        {meta}
        {bubble}
      </div>
    )
  }

  return (
    <div className={rowClass} data-id={msg.id}>
      <div className="avatar-slot">{showSender && <Avatar name={name} seed={msg.user_id} color={colors?.[1]} />}</div>
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
