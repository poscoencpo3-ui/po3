import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatListTime, previewText } from '../lib/format'

function Highlight({ text, query }) {
  if (!query) return text
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  const start = Math.max(0, i - 30)
  return (
    <>
      {start > 0 && '…'}
      {text.slice(start, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length, i + query.length + 80)}
    </>
  )
}

export default function SearchPanel({ roomId, onJump, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)

  async function search(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setBusy(true)
    const escaped = q.replace(/[\\%_]/g, (c) => '\\' + c)
    const { data } = await supabase
      .from('messages')
      .select('id, kind, body, sender_name, sender_company, created_at')
      .eq('room_id', roomId)
      .in('kind', ['text', 'file', 'report'])
      .is('deleted_at', null)
      .ilike('body', `%${escaped}%`)
      .order('id', { ascending: false })
      .limit(100)
    setResults(data || [])
    setBusy(false)
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer wide" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>🔍 대화 검색</strong>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <form className="search-form" onSubmit={search}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색어 (예: 크레인, 타설)" autoFocus />
          <button className="btn primary" disabled={busy || !query.trim()}>
            검색
          </button>
        </form>
        <div className="drawer-body">
          {results && <div className="muted small pad-x">검색 결과 {results.length}건</div>}
          <ul className="search-results">
            {(results || []).map((m) => (
              <li key={m.id}>
                <button onClick={() => onJump(m.id)}>
                  <div className="small">
                    <strong>{m.sender_name}</strong>
                    {m.sender_company && <span className="muted"> · {m.sender_company}</span>}
                    <span className="muted"> · {formatListTime(m.created_at)}</span>
                  </div>
                  <div className="search-snippet">
                    {m.kind === 'text' ? <Highlight text={m.body} query={query.trim()} /> : previewText(m.kind, m.body)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
