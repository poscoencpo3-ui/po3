const pad = (n) => String(n).padStart(2, '0')
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatTime(iso) {
  const d = new Date(iso)
  const h = d.getHours()
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(d.getMinutes())}`
}

export function formatDay(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`
}

export function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function minuteKey(iso) {
  return `${dayKey(iso)}-${new Date(iso).getHours()}-${new Date(iso).getMinutes()}`
}

// 채팅 목록용: 오늘이면 시간, 어제면 "어제", 그 외 날짜
export function formatListTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  if (dayKey(iso) === dayKey(now)) return formatTime(iso)
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(iso) === dayKey(yesterday)) return '어제'
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일`
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export function fileStamp(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function memberLabel(name, company) {
  return company ? `${name} (${company})` : name
}

// ABCD2345 -> ABCD-2345
export function formatCode(code) {
  return code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

export function previewText(kind, body) {
  if (kind === 'image') return '사진'
  return body || ''
}

const AVATAR_COLORS = ['#e57373', '#f06292', '#ba68c8', '#7986cb', '#4fc3f7', '#4db6ac', '#81c784', '#ffb74d', '#a1887f', '#90a4ae']

export function avatarColor(id = '') {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
