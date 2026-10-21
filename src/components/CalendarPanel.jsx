import { useMemo, useState } from 'react'
import { formatDateRange, scheduleStatus, todayStr } from '../lib/format'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const COLORS = ['#5b8def', '#e0607f', '#3f9e5d', '#e08d2f', '#8f62d4', '#2b9c9c', '#d55f48']
const pad = (n) => String(n).padStart(2, '0')

export const scheduleColor = (id) => COLORS[id % COLORS.length]

export default function CalendarPanel({ schedules, me, isAdmin, focusDate, onAdd, onEdit, onDelete, onTogglePin, onClose }) {
  const initial = focusDate ? new Date(focusDate + 'T00:00') : new Date()
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1))
  const [selected, setSelected] = useState(focusDate || null)
  const today = todayStr()

  const cells = useMemo(() => {
    const first = new Date(month)
    const startDay = new Date(first)
    startDay.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDay)
      d.setDate(startDay.getDate() + i)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      return { key, day: d.getDate(), inMonth: d.getMonth() === month.getMonth(), weekday: d.getDay() }
    })
  }, [month])

  const monthStart = cells[0].key
  const monthEnd = cells[41].key
  const visible = schedules.filter((s) => s.end_date >= monthStart && s.start_date <= monthEnd)
  const onDay = (key) => visible.filter((s) => s.start_date <= key && s.end_date >= key)

  const monthKey = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`
  const list = (selected ? onDay(selected) : schedules.filter((s) => s.start_date.slice(0, 7) <= monthKey && s.end_date.slice(0, 7) >= monthKey))
    .slice()
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id)

  const move = (delta) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
    setSelected(null)
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer wide calendar" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>📅 일정</strong>
          <div className="header-actions">
            <button className="btn small primary" onClick={() => onAdd(selected || today)}>
              + 일정 추가
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>
        </header>

        <div className="cal-nav">
          <button className="icon-btn" onClick={() => move(-1)} aria-label="이전 달">
            ‹
          </button>
          <strong>
            {month.getFullYear()}년 {month.getMonth() + 1}월
          </strong>
          <button className="icon-btn" onClick={() => move(1)} aria-label="다음 달">
            ›
          </button>
          <button
            className="btn small ghost"
            onClick={() => {
              const now = new Date()
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
              setSelected(today)
            }}
          >
            오늘
          </button>
        </div>

        <div className="cal-grid">
          {WEEK.map((w, i) => (
            <div key={w} className={'cal-week' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>
              {w}
            </div>
          ))}
          {cells.map((c) => {
            const items = onDay(c.key)
            return (
              <button
                key={c.key}
                className={
                  'cal-cell' +
                  (c.inMonth ? '' : ' out') +
                  (c.key === today ? ' today' : '') +
                  (c.key === selected ? ' selected' : '') +
                  (c.weekday === 0 ? ' sun' : c.weekday === 6 ? ' sat' : '')
                }
                onClick={() => setSelected(c.key === selected ? null : c.key)}
              >
                <span className="cal-day">{c.day}</span>
                {items.slice(0, 2).map((s) => (
                  <span key={s.id} className="cal-bar" style={{ background: scheduleColor(s.id) }}>
                    {s.start_date === c.key || c.weekday === 0 ? s.title : ' '}
                  </span>
                ))}
                {items.length > 2 && <span className="cal-more">+{items.length - 2}</span>}
              </button>
            )
          })}
        </div>

        <div className="cal-list">
          <div className="muted small cal-list-title">
            {selected ? `${formatDateRange(selected, selected)} 일정` : `${month.getMonth() + 1}월 일정`} {list.length}건
          </div>
          {list.length === 0 && <p className="muted pad">등록된 일정이 없습니다.</p>}
          {list.map((s) => {
            const st = scheduleStatus(s.start_date, s.end_date)
            const canEdit = isAdmin || s.created_by === me
            return (
              <div key={s.id} className="schedule-item" style={{ borderLeftColor: scheduleColor(s.id) }}>
                <div className="schedule-top">
                  <strong>
                    {s.pinned && '📌 '}
                    {s.title}
                  </strong>
                  <span className={'status ' + st.kind}>{st.label}</span>
                </div>
                <div className="small">{formatDateRange(s.start_date, s.end_date)}</div>
                {s.memo && <div className="small schedule-memo">{s.memo}</div>}
                <div className="schedule-bottom">
                  <span className="muted small">등록: {s.creator_name || '-'}</span>
                  <span className="schedule-actions">
                    {isAdmin && (
                      <button className="btn small ghost" onClick={() => onTogglePin(s)}>
                        {s.pinned ? '고정 해제' : '상단 고정'}
                      </button>
                    )}
                    {canEdit && (
                      <>
                        <button className="btn small ghost" onClick={() => onEdit(s)}>
                          수정
                        </button>
                        <button className="btn small ghost danger" onClick={() => onDelete(s)}>
                          삭제
                        </button>
                      </>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
