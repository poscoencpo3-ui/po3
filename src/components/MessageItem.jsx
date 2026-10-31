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
          <span>{snap.kind === 'image' ? '사진' : snap.kind === 'file' ? `파일: ${snap.body}` : snap.kind === 'report' ? '📝 작업일보' : snap.kind === 'bot' ? `📌 ${snap.body}` : snap.body}</span>
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

function BotCard({ data }) {
  const d = data || {}
  return (
    <div className="bot-card">
      {d.title && <div className="bot-title">{d.title}</div>}
      {d.text && <div className="bot-text">{d.text}</div>}
      {d.author && <div className="muted small">작성: {d.author}</div>}
      {d.url && (
        <a className="btn small bot-link" href={d.url} target="_blank" rel="noopener noreferrer">
          {d.source || '사이트'} 열기 →
        </a>
      )}
    </div>
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
  deletedByOther,
  isNotice,
  highlighted,
  mentionNames,
  mentionsMe,
  ackInfo,
  onShowAcks,
  onOpenImage,
  onMediaLoad,
  onMenu,
  onJump,
  onDownload,
}) {
  const pressTimer = useRef(null)
  const hadSelection = useRef(false)
  const press = useRef(null)

  if (msg.kind === 'system') {
    return <div className="system-msg">{msg.body}</div>
  }

  const name = msg.sender_name || member?.display_name || '(알 수 없음)'
  const company = msg.sender_company ?? member?.company
  const deleted = Boolean(msg.deleted_at)
  const bigEmoji = !deleted && msg.kind === 'text' && !msg.reply_snapshot && !msg.is_urgent && isEmojiOnly(msg.body)

  const menuHandlers = {
    // 우클릭 직전에 이미 글자를 선택해 둔 상태였는지 기억 (맥은 우클릭만 해도 단어가 선택되므로)
    onMouseDown: (e) => {
      if (e.button !== 2) return
      const sel = window.getSelection()
      hadSelection.current = Boolean(sel && !sel.isCollapsed && e.currentTarget.contains(sel.anchorNode))
    },
    onContextMenu: (e) => {
      // 마우스로 글자를 선택해 둔 상태면 브라우저 기본 메뉴(복사)를 그대로 띄움
      if (hadSelection.current) {
        hadSelection.current = false
        return
      }
      e.preventDefault()
      onMenu(e.clientX, e.clientY)
    },
    // 휴대폰 길게 누르기
    onTouchStart: (e) => {
      const t = e.touches[0]
      press.current = { x: t.clientX, y: t.clientY, fired: false }
      clearTimeout(pressTimer.current)
      pressTimer.current = setTimeout(() => {
        press.current.fired = true
        navigator.vibrate?.(25)
        onMenu(t.clientX, t.clientY)
      }, 500)
    },
    // 누르는 동안 손가락이 조금 흔들리는 건 무시하고, 스크롤할 만큼 움직이면 취소
    onTouchMove: (e) => {
      const t = e.touches[0]
      const p = press.current
      if (p && Math.hypot(t.clientX - p.x, t.clientY - p.y) > 10) clearTimeout(pressTimer.current)
    },
    onTouchEnd: (e) => {
      clearTimeout(pressTimer.current)
      // 메뉴가 뜬 뒤 손을 뗄 때 생기는 클릭이 메뉴를 바로 닫지 않도록
      if (press.current?.fired) e.preventDefault()
    },
    onTouchCancel: () => clearTimeout(pressTimer.current),
  }

  const meta = (
    <div className="msg-meta">
      {unread > 0 && <span className="unread">{unread}</span>}
      {msg.edited_at && !msg.deleted_at && <span className="edited">수정됨</span>}
      {showTime && <span className="time">{formatTime(msg.created_at)}</span>}
    </div>
  )

  let content
  if (deleted) {
    content = <span className="deleted-text">{deletedByOther ? '관리자가 삭제한 메시지입니다' : '삭제된 메시지입니다'}</span>
  } else if (msg.kind === 'image') {
    content = <ImageThumb msg={msg} onOpen={onOpenImage} onLoad={onMediaLoad} />
  } else if (msg.kind === 'file') {
    content = <FileCard msg={msg} onDownload={onDownload} />
  } else if (msg.kind === 'report') {
    content = <ReportCard data={msg.data} />
  } else if (msg.kind === 'bot') {
    content = <BotCard data={msg.data} />
  } else {
    content = <RichText text={msg.body} mentionNames={mentionNames} />
  }

  const classes = [
    'bubble',
    bigEmoji ? 'emoji-only' : msg.kind === 'image' && !deleted && !msg.reply_snapshot ? 'image' : 'text',
    msg.kind === 'file' || msg.kind === 'report' ? 'card' : '',
    msg.kind === 'bot' && !deleted ? 'bot' : '',
    deleted ? 'deleted' : '',
    msg.is_urgent && !deleted ? 'urgent' : '',
    ackInfo?.pending ? 'urgent-pending' : '',
    isNotice ? 'notice' : '',
    mentionsMe ? 'mentions-me' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const bubbleStyle = !mine && colors && !bigEmoji && !msg.is_urgent && !deleted && msg.kind !== 'bot' ? { background: colors[0] } : undefined

  const bubble = (
    <div className={classes} style={bubbleStyle} {...(deleted ? {} : menuHandlers)}>
      {msg.is_urgent && !deleted && <div className="urgent-label">🚨 긴급·중요</div>}
      {msg.is_forwarded && !deleted && <div className="forwarded-label">↪ 전달됨</div>}
      {!deleted && <ReplyQuote msg={msg} onJump={onJump} />}
      {content}
      {ackInfo && (
        <button
          className={'ack-status' + (ackInfo.pending ? ' pending' : '')}
          onClick={(e) => {
            e.stopPropagation()
            onShowAcks()
          }}
        >
          {ackInfo.pending ? '👆 눌러서 확인' : `✅ 확인 ${ackInfo.acked}/${ackInfo.total}`}
        </button>
      )}
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
      <div className="avatar-slot">
        {showSender && (msg.kind === 'bot' ? <div className="bot-avatar">📌</div> : <Avatar name={name} seed={msg.user_id} color={colors?.[1]} />)}
      </div>
      <div className="msg-body">
        {showSender && (
          <div className="sender">
            {name}
            {company && <span className="company"> · {company}</span>}
            {member?.is_admin && <span className="admin-tag">관리자</span>}
            {msg.kind === 'bot' && <span className="bot-tag">연동</span>}
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
