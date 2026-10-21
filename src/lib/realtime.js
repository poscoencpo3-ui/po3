import { supabase } from './supabase'

// 실시간 이벤트를 앱 전체에 나눠주는 작은 이벤트 버스.
// RLS 덕분에 내가 속한 방의 변경 사항만 들어옵니다.
const listeners = new Set()

export function onRealtime(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(event) {
  listeners.forEach((fn) => fn(event))
}

export function startRealtime() {
  // 같은 이름의 채널은 재사용되므로, 다시 시작할 때마다 새 이름을 씀
  const channel = supabase
    .channel(`po3-talk-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) =>
      emit({ type: 'message', row: p.new })
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (p) =>
      emit({ type: 'message-update', row: p.new })
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, (p) =>
      emit({ type: 'member', event: p.eventType, row: p.eventType === 'DELETE' ? p.old : p.new })
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (p) =>
      emit({ type: 'room', row: p.new })
    )
    .subscribe((status, err) => {
      if (import.meta.env.DEV) console.debug('[realtime]', status, err?.message || '')
      emit({ type: 'status', status })
      // 처음 연결되거나 끊겼다 다시 연결되면 놓친 메시지를 다시 불러옴
      if (status === 'SUBSCRIBED') emit({ type: 'resync' })
    })

  const resync = () => emit({ type: 'resync' })
  window.addEventListener('online', resync)

  return () => {
    window.removeEventListener('online', resync)
    supabase.removeChannel(channel)
  }
}
