import { formatDateRange, scheduleStatus, todayStr } from '../lib/format'
import { scheduleColor } from './CalendarPanel'

export default function PinnedSchedules({ schedules, onOpen }) {
  const today = todayStr()
  const pinned = schedules
    .filter((s) => s.pinned && s.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (!pinned.length) return null
  const shown = pinned.slice(0, 2)
  return (
    <div className="pinned-schedules">
      {shown.map((s) => {
        const st = scheduleStatus(s.start_date, s.end_date)
        return (
          <button key={s.id} className="pinned-item" onClick={() => onOpen(s.start_date)}>
            <span className="dot" style={{ background: scheduleColor(s.id) }} />
            <span className="pinned-title">📅 {s.title}</span>
            <span className="pinned-date">{formatDateRange(s.start_date, s.end_date)}</span>
            <span className={'status ' + st.kind}>{st.label}</span>
          </button>
        )
      })}
      {pinned.length > shown.length && (
        <button className="pinned-more" onClick={() => onOpen(pinned[shown.length].start_date)}>
          고정 일정 {pinned.length - shown.length}건 더 보기
        </button>
      )}
    </div>
  )
}
