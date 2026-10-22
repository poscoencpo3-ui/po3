const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export default function MessageMenu({ menu, mine, isAdmin, isNotice, onClose, actions }) {
  const { x, y, msg } = menu
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
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <ul className={'context-menu' + (isTouch ? ' sheet' : '')} style={style} onClick={(e) => e.stopPropagation()}>
        {!deleted && item('↩️ 답장', actions.reply)}
        {!deleted && (msg.kind === 'text' || msg.kind === 'report') && item('📋 복사', actions.copy)}
        {!deleted && msg.kind === 'image' && !msg.image_expired && item('🖼️ 크게 보기 / 저장', actions.openImage)}
        {!deleted && msg.kind === 'file' && !msg.image_expired && item('💾 파일 저장', actions.downloadFile)}
        {!deleted && msg.kind === 'text' && item('📅 일정으로 등록', actions.schedule)}
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
