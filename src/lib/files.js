import { supabase } from './supabase'

export const FILES_BUCKET = 'chat-files'
export const MAX_FILE_SIZE = 20 * 1024 * 1024

// 비공개 버킷의 파일을 원래 이름으로 저장.
// Storage 의 download 옵션은 한글 파일명을 이중 인코딩하므로(%25EA...) 브라우저에서 이름을 붙여 저장함
export async function downloadFile(path, name) {
  const { data, error } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(path, 60)
  if (error) throw error
  const res = await fetch(data.signedUrl)
  if (!res.ok) throw new Error(`download ${res.status}`)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a) // 페이지에 붙여야 저장 이름이 적용되는 브라우저가 있음
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// 저장 경로는 영문/숫자만 쓰고, 원래 파일 이름은 메시지에 따로 저장
export function storageExtension(name) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return /^[a-z0-9]{1,10}$/.test(ext) && ext !== name.toLowerCase() ? ext : 'bin'
}

export function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase()
  if (ext === 'pdf') return '📕'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗'
  if (['doc', 'docx', 'hwp', 'hwpx', 'txt'].includes(ext)) return '📘'
  if (['ppt', 'pptx'].includes(ext)) return '📙'
  if (['dwg', 'dxf'].includes(ext)) return '📐'
  if (['zip', '7z', 'rar'].includes(ext)) return '🗜️'
  return '📄'
}

// 파일 금지(관리자 지정)인 사람이 파일 제한 방에서 파일을 보내려 할 때 안내
export const FILES_BLOCKED_MESSAGE = '관리자가 이 방에서 파일 전송을 막았습니다. 사진·캡쳐는 보낼 수 있습니다.'
