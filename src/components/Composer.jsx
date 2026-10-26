import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { previewText } from '../lib/format'
import EmojiPanel from './EmojiPanel'
import Avatar from './Avatar'
import { personOf } from '../lib/person'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const LONG_PLACEHOLDER = '메시지 입력 (Enter 전송 · Shift+Enter 줄바꿈 · Ctrl+V 캡쳐 붙여넣기 · @ 멘션)'
const narrowQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)') : null

// 좁은 창(앱 창을 카톡처럼 줄인 경우)에서는 안내 문구가 두 줄로 넘치지 않게 짧게
function usePlaceholder() {
  const [narrow, setNarrow] = useState(() => isTouch || Boolean(narrowQuery?.matches))
  useEffect(() => {
    if (!narrowQuery || isTouch) return
    const onChange = () => setNarrow(narrowQuery.matches)
    narrowQuery.addEventListener('change', onChange)
    return () => narrowQuery.removeEventListener('change', onChange)
  }, [])
  return narrow ? '메시지 입력' : LONG_PLACEHOLDER
}

export default function Composer({ members, me, replyTo, onCancelReply, onSend, onPickImages, onPickDocs, onOpenReport, onOpenSchedule }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [panel, setPanel] = useState(null) // 'menu' | 'emoji'
  const [urgent, setUrgent] = useState(false)
  const [mention, setMention] = useState(null) // { query, start }
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef(null)
  const imageRef = useRef(null)
  const cameraRef = useRef(null)
  const docRef = useRef(null)
  const caretRef = useRef(null) // 내용을 바꾼 직후 커서를 둘 위치
  const placeholder = usePlaceholder()

  // 화면이 그려지기 전에 커서를 옮겨야 그 사이 입력한 글자가 엉뚱한 곳에 들어가지 않음
  useLayoutEffect(() => {
    const el = inputRef.current
    if (caretRef.current == null || !el) return
    el.focus()
    el.selectionStart = el.selectionEnd = caretRef.current
    caretRef.current = null
    resize(el)
  }, [text])

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  // members는 사람별로 묶인 목록, me는 내 사람 번호 → 멘션에는 사람 번호를 저장
  const others = members.filter((m) => personOf(m) !== me)
  const candidates = mention
    ? others
        .filter((m) => `${m.display_name}${m.company}`.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : []

  function resize(el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  function updateMention(el) {
    const before = el.value.slice(0, el.selectionStart)
    const m = before.match(/(?:^|\s)@([^\s@]{0,20})$/)
    if (m && others.length) {
      setMention({ query: m[1], start: el.selectionStart - m[1].length - 1 })
      setMentionIndex(0)
    } else {
      setMention(null)
    }
  }

  function replaceRange(start, end, insert) {
    caretRef.current = start + insert.length
    setText(text.slice(0, start) + insert + text.slice(end))
  }

  function pickMention(member) {
    const caret = inputRef.current.selectionStart
    replaceRange(mention.start, caret, `@${member.display_name} `)
    setMention(null)
  }

  function insertEmoji(emoji) {
    const el = inputRef.current
    const start = el ? el.selectionStart : text.length
    const end = el ? el.selectionEnd : text.length
    replaceRange(start, end, emoji)
  }

  async function send() {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    const mentions = [...new Set(others.filter((m) => value.includes(`@${m.display_name}`)).map((m) => personOf(m)))]
    setText('')
    setMention(null)
    requestAnimationFrame(() => inputRef.current && resize(inputRef.current))
    const ok = await onSend({ text: value, mentions, urgent })
    if (ok) {
      setUrgent(false)
      if (panel === 'menu') setPanel(null)
    } else {
      setText(value)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return
    if (mention && candidates.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : candidates.length - 1)) % candidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(candidates[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setMention(null)
        return
      }
    }
    // 한글 조합 중 Enter 는 위에서 걸러짐 (마지막 글자가 두 번 전송되는 문제 방지)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const menuItem = (icon, label, onClick, className = '') => (
    <button
      className={'plus-item ' + className}
      onClick={() => {
        onClick()
      }}
    >
      <span className="plus-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )

  return (
    <div className="composer-wrap">
      {replyTo && (
        <div className="composer-bar reply-bar">
          <div>
            <strong>↩️ {replyTo.sender_name}</strong>님에게 답장
            <div className="muted small ellipsis">{previewText(replyTo.kind, replyTo.kind === 'file' ? replyTo.file_name : replyTo.body)}</div>
          </div>
          <button className="icon-btn" onClick={onCancelReply} aria-label="답장 취소">
            ✕
          </button>
        </div>
      )}
      {urgent && (
        <div className="composer-bar urgent-bar">
          <span>🚨 긴급 메시지로 보냅니다 (모두에게 강조 알림)</span>
          <button className="icon-btn" onClick={() => setUrgent(false)} aria-label="긴급 취소">
            ✕
          </button>
        </div>
      )}

      {mention && candidates.length > 0 && (
        <ul className="mention-picker">
          {candidates.map((m, i) => (
            <li key={personOf(m)}>
              <button
                className={i === mentionIndex ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickMention(m)
                }}
              >
                <Avatar name={m.display_name} seed={m.user_id} size={26} />
                <span>{m.display_name}</span>
                {m.company && <span className="muted small">{m.company}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="composer">
        <button
          className={'icon-btn attach' + (panel === 'menu' ? ' open' : '')}
          onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
          title="사진, 파일, 이모티콘 등"
          aria-label="더보기 메뉴"
        >
          +
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          maxLength={5000}
          onChange={(e) => {
            setText(e.target.value)
            resize(e.target)
            updateMention(e.target)
          }}
          onClick={(e) => updateMention(e.target)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setMention(null), 150)}
        />
        <button
          className={'icon-btn emoji-btn' + (panel === 'emoji' ? ' open' : '')}
          onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')}
          title="이모티콘"
          aria-label="이모티콘"
        >
          😀
        </button>
        <button className={'btn primary send' + (urgent ? ' urgent' : '')} onClick={send} disabled={!text.trim() || sending}>
          전송
        </button>
      </div>

      {panel === 'menu' && (
        <div className="plus-menu">
          {menuItem('🖼️', '사진', () => imageRef.current.click())}
          {menuItem('📷', '카메라', () => cameraRef.current.click())}
          {menuItem('📎', '파일', () => docRef.current.click())}
          {menuItem('😀', '이모티콘', () => setPanel('emoji'))}
          {menuItem('📅', '일정', () => {
            setPanel(null)
            onOpenSchedule()
          })}
          {menuItem('📝', '작업일보', () => {
            setPanel(null)
            onOpenReport()
          })}
          {menuItem('🚨', urgent ? '긴급 해제' : '긴급 메시지', () => {
            setUrgent(!urgent)
            setPanel(null)
            inputRef.current?.focus()
          }, 'urgent')}
        </div>
      )}
      {panel === 'emoji' && <EmojiPanel onPick={insertEmoji} />}

      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onPickImages(e.target.files)
          e.target.value = ''
          setPanel(null)
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          onPickImages(e.target.files)
          e.target.value = ''
          setPanel(null)
        }}
      />
      <input
        ref={docRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          onPickDocs(e.target.files)
          e.target.value = ''
          setPanel(null)
        }}
      />
    </div>
  )
}
