import { useRef } from 'react'
import { canEdit, canForward } from '../lib/forward'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function MessageMenu({ menu, me, mine, isAdmin, isNotice, onClose, actions }) {
  const { x, y, msg } = menu
  const openedAt = useRef(Date.now())
  // 길게 누른 손을 떼는 순간의 클릭으로 메뉴가 바로 닫히지 않도록 잠깐 무시
  const close = () => {
    if (Date.now() - openedAt.current > 400) onClose()
  }
  const deleted = Boolean(msg.deleted_at)
  const style = isTouch ? undefined : { left: Math.min(x, window.innerWidth - 190), top: Math.min(y, window.innerHeight - 300) }
  const item = (label, fn, className = '') => (
    <li
      className={className}
      onClick={() => {
        fn()
        onClose()
      }}
    >
      {label}
    </li>
  )

  return (
    <div className="menu-backdrop" onClick={close} onContextMenu={(e) => (e.preventDefault(), close())}>
      <ul className={'context-menu' + (isTouch ? ' sheet' : '')} style={style} onClick={(e) => e.stopPropagation()}>
        {!deleted && item('↩️ 답장', actions.reply)}
        {!deleted && ['text', 'report', 'bot'].includes(msg.kind) && item('📋 복사', actions.copy)}
        {canForward(msg) && item('↪️ 전달', actions.forward)}
        {canEdit(msg, me) && item('✏️ 수정', actions.edit)}
        {!deleted && msg.kind === 'image' && !msg.image_expired && item('🖼️ 크게 보기 / 저장', actions.openImage)}
        {!deleted && msg.kind === 'file' && !msg.image_expired && item('💾 파일 저장', actions.downloadFile)}
        {!deleted && (msg.kind === 'text' || msg.kind === 'bot') && item('📅 일정으로 등록', actions.schedule)}
        {!deleted && isAdmin && !isNotice && item('📢 공지로 등록', () => actions.notice(msg.id))}
        {isAdmin && isNotice && item('📢 공지 해제', () => actions.notice(null))}
        {!deleted && (mine || isAdmin) && item('🗑️ 삭제', actions.remove, 'danger')}
        <li className="muted" onClick={onClose}>
          닫기
        </li>
      </ul>
    </div>
  )
}
