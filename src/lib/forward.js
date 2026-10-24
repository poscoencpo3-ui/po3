import { supabase, BUCKET } from './supabase'
import { FILES_BUCKET } from './files'
import { sendPush } from './push'

const extOf = (path) => path.split('.').pop()

// 다른 방(또는 같은 방)으로 메시지 전달. 사진·파일은 대상 방 폴더로 복사해야 그 방 사람들이 볼 수 있음
export async function forwardMessage(msg, targetRoomId, me) {
  const base = { room_id: targetRoomId, user_id: me, is_forwarded: true }
  let values
  if (msg.kind === 'image') {
    const path = `${targetRoomId}/${crypto.randomUUID()}.${extOf(msg.image_path)}`
    const { error } = await supabase.storage.from(BUCKET).copy(msg.image_path, path)
    if (error) throw error
    values = { kind: 'image', image_path: path, image_width: msg.image_width, image_height: msg.image_height }
  } else if (msg.kind === 'file') {
    const path = `${targetRoomId}/${crypto.randomUUID()}.${extOf(msg.file_path)}`
    const { error } = await supabase.storage.from(FILES_BUCKET).copy(msg.file_path, path)
    if (error) throw error
    values = { kind: 'file', file_path: path, file_name: msg.file_name, file_size: msg.file_size, body: msg.file_name }
  } else if (msg.kind === 'report') {
    values = { kind: 'report', data: msg.data, body: msg.body }
  } else {
    // 글, 연동(📌) 메시지는 글로 전달
    values = { kind: 'text', body: msg.body }
  }
  const { data, error } = await supabase.from('messages').insert({ ...base, ...values }).select().single()
  if (error) throw error
  sendPush(data.id)
  return data
}

export function canForward(msg) {
  if (msg.deleted_at || msg.kind === 'system') return false
  if ((msg.kind === 'image' || msg.kind === 'file') && msg.image_expired) return false
  return true
}

export function canEdit(msg, me) {
  return msg.kind === 'text' && !msg.deleted_at && msg.user_id === me && Date.now() - new Date(msg.created_at).getTime() < 24 * 60 * 60 * 1000
}
