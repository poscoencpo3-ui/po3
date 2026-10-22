import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDay, formatBytes, formatListTime } from '../lib/format'
import { downloadFile, fileIcon } from '../lib/files'
import { toast } from '../lib/toast'
import { ImageThumb } from './MessageItem'

const PAGE = 60

export default function GalleryPanel({ roomId, onOpenImage, onJump, onClose }) {
  const [tab, setTab] = useState('image')
  const [items, setItems] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(
    async (before) => {
      let q = supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('kind', tab)
        .is('deleted_at', null)
        .eq('image_expired', false)
        .order('id', { ascending: false })
        .limit(PAGE)
      if (before) q = q.lt('id', before)
      const { data } = await q
      setItems((prev) => (before ? [...(prev || []), ...(data || [])] : data || []))
      setHasMore((data || []).length === PAGE)
    },
    [roomId, tab]
  )

  useEffect(() => {
    load()
  }, [load])

  function switchTab(next) {
    if (next === tab) return
    setItems(null) // 다른 탭의 목록이 잠깐 보이지 않도록
    setTab(next)
  }

  const groups = []
  for (const m of items || []) {
    const day = formatDay(m.created_at)
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] })
    groups[groups.length - 1].items.push(m)
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>사진 · 파일 모아보기</strong>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className="tabs">
          <button className={tab === 'image' ? 'active' : ''} onClick={() => switchTab('image')}>
            🖼️ 사진
          </button>
          <button className={tab === 'file' ? 'active' : ''} onClick={() => switchTab('file')}>
            📎 파일
          </button>
        </div>
        <div className="drawer-body">
          {items === null && <p className="muted pad">불러오는 중…</p>}
          {items && items.length === 0 && <p className="muted pad">{tab === 'image' ? '사진이' : '파일이'} 없습니다.</p>}
          {groups.map((g) => (
            <section key={g.day}>
              <div className="gallery-day">{g.day}</div>
              {tab === 'image' ? (
                <div className="gallery-grid">
                  {g.items.map((m) => (
                    <div key={m.id} className="gallery-cell">
                      <ImageThumb msg={m} onOpen={() => onOpenImage(m)} square />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="file-list">
                  {g.items.map((m) => (
                    <li key={m.id}>
                      <span className="file-icon">{fileIcon(m.file_name)}</span>
                      <div className="file-info">
                        <button className="link-btn" onClick={() => onJump(m.id)}>
                          {m.file_name}
                        </button>
                        <div className="muted small">
                          {formatBytes(m.file_size)} · {m.sender_name} · {formatListTime(m.created_at)}
                        </div>
                      </div>
                      <button
                        className="btn small"
                        onClick={() => downloadFile(m.file_path, m.file_name).catch(() => toast('파일을 받지 못했습니다.'))}
                      >
                        저장
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {hasMore && (
            <button className="btn block" onClick={() => load(items[items.length - 1].id)}>
              더 보기
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
