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

export function previewText(kind, body, { deleted = false, urgent = false } = {}) {
  if (deleted) return '삭제된 메시지입니다'
  const text = kind === 'image' ? '사진' : kind === 'file' ? `파일: ${body}` : kind === 'report' ? '📝 작업일보' : body || ''
  return urgent ? `🚨 ${text}` : text
}

// 오늘 날짜 'YYYY-MM-DD' (내 PC 시간 기준)
export function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatShortDate(str) {
  const d = parseDate(str)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`
}

export function formatDateRange(start, end) {
  return start === end ? formatShortDate(start) : `${formatShortDate(start)} ~ ${formatShortDate(end)}`
}

// 일정 상태: D-3 / 진행중 / 종료
export function scheduleStatus(start, end) {
  const today = parseDate(todayStr())
  const s = parseDate(start)
  const e = parseDate(end)
  if (today < s) return { label: `D-${Math.round((s - today) / 86400000)}`, kind: 'upcoming' }
  if (today > e) return { label: '종료', kind: 'done' }
  return { label: start === end ? '오늘' : '진행중', kind: 'now' }
}

export function formatBytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// 이모티콘만 1~3개 보낸 메시지는 카톡처럼 크게 표시
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200d|\ufe0f|\u20e3|\s)+$/u
export function isEmojiOnly(text) {
  if (!text || !EMOJI_ONLY.test(text) || !/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(text)) return false
  const count = [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text.trim())].filter((s) => s.segment.trim()).length
  return count <= 3
}

// 참여자별 말풍선 색 [말풍선, 아바타]
export const MEMBER_COLORS = [
  ['#e3efff', '#5b8def'],
  ['#ffe4ec', '#e0607f'],
  ['#e1f5e6', '#3f9e5d'],
  ['#fff0db', '#e08d2f'],
  ['#eee5fb', '#8f62d4'],
  ['#daf4f4', '#2b9c9c'],
  ['#f5eedf', '#a07c44'],
  ['#fde5df', '#d55f48'],
  ['#e6ebf7', '#5a6d9b'],
  ['#eff7d9', '#7f9e34'],
]

export function reportText(data) {
  return REPORT_FIELDS.filter((f) => data?.[f.key])
    .map((f) => `${f.label}: ${data[f.key]}`)
    .join('\n')
}

export const REPORT_FIELDS = [
  { key: 'date', label: '작업일' },
  { key: 'company', label: '업체' },
  { key: 'area', label: '공종/구간' },
  { key: 'work', label: '금일 작업' },
  { key: 'workers', label: '투입 인원' },
  { key: 'equipment', label: '장비' },
  { key: 'safety', label: '안전/특이사항' },
  { key: 'tomorrow', label: '명일 계획' },
]

const AVATAR_COLORS = ['#e57373', '#f06292', '#ba68c8', '#7986cb', '#4fc3f7', '#4db6ac', '#81c784', '#ffb74d', '#a1887f', '#90a4ae']

export function avatarColor(id = '') {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
