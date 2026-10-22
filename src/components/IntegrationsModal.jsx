import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatListTime } from '../lib/format'
import { copyText, toast } from '../lib/toast'

const HOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push`

function snippet(token) {
  return `// 포스트잇을 새로 저장한 직후 한 번 호출 (실패해도 화이트보드에는 영향 없음)
function notifyPo3Talk(note) {
  fetch('${HOOK_URL}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hook: '${token}',
      title: '새 포스트잇',
      text: note.text,        // 포스트잇 내용
      author: note.author,    // 작성자 이름
      url: location.href,     // 화이트보드 주소
    }),
  }).catch(() => {})
}`
}

function chatgptPrompt(token, name) {
  return `${name}에 포스트잇이 새로 추가되면, 우리 회사 메신저(협력사 소통방)로 알림을 보내는 기능을 추가해줘.

[조건]
1. 포스트잇을 추가한 사람의 브라우저에서, 저장에 성공한 직후 딱 한 번만 호출할 것
   (다른 사람 화면에 동기화되어 나타날 때나, 페이지를 새로 불러올 때는 호출하지 말 것)
2. 포스트잇 수정·이동·삭제 때는 호출하지 말 것
3. 알림 전송이 실패해도 화이트보드 동작에는 아무 영향이 없게 할 것 (오류는 무시)
4. 보낼 내용: 포스트잇 내용(text), 작성자 이름(author), 현재 페이지 주소(url)

[사용할 코드]
${snippet(token)}

위 함수를 추가하고, 포스트잇 저장이 성공하는 지점에서 notifyPo3Talk({ text: 포스트잇 내용, author: 작성자 이름 }) 를 호출해줘.`
}

export default function IntegrationsModal({ room, onClose }) {
  const [items, setItems] = useState(null)
  const [name, setName] = useState('화이트보드')
  const [created, setCreated] = useState(null) // { token, name }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('integrations').select('*').eq('room_id', room.id).order('created_at')
    setItems(data || [])
  }, [room.id])

  useEffect(() => {
    load()
  }, [load])

  async function create(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('create_integration', { p_room: room.id, p_name: name.trim() })
    setBusy(false)
    if (error) return toast('연동 추가에 실패했습니다. (v3 SQL을 실행했는지 확인해 주세요)')
    setCreated({ token: data, name: name.trim() })
    load()
  }

  async function remove(item) {
    if (!window.confirm(`'${item.name}' 연동을 해제할까요?\n이 키를 쓰던 사이트에서는 더 이상 알림이 오지 않습니다.`)) return
    const { error } = await supabase.rpc('delete_integration', { p_id: item.id })
    if (error) return toast('해제에 실패했습니다.')
    load()
  }

  async function sendTest() {
    try {
      const res = await fetch(HOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook: created.token, title: '연동 테스트', text: '이 메시지가 보이면 연동이 정상입니다.', author: '관리자 테스트' }),
      })
      toast(res.ok ? `'${room.name}' 방에 테스트 메시지를 보냈습니다.` : `테스트 실패 (${res.status}). push 함수를 최신 코드로 배포했는지 확인해 주세요.`)
    } catch {
      toast('테스트 실패: push 함수에 연결하지 못했습니다.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal form-modal integrations" onClick={(e) => e.stopPropagation()}>
        <h3>📌 외부 사이트 연동 · {room.name}</h3>
        <div className="form-scroll">
          <p className="small muted">
            다른 사이트(예: 화이트보드)에서 일이 생기면 이 채팅방에 📌 메시지와 알림을 보냅니다. 사이트마다 연동 키를 하나씩 발급하세요.
          </p>

          {!created && (
            <form className="inline-form" onSubmit={create}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="연동 이름 (예: 화이트보드)" maxLength={30} />
              <button className="btn primary" disabled={busy || !name.trim()}>
                연동 키 발급
              </button>
            </form>
          )}

          {created && (
            <div className="created-box">
              <div className="check-item ok">
                <span className="check-icon">✅</span>
                <div>
                  <div className="check-label">'{created.name}' 연동 키가 발급되었습니다</div>
                  <div className="small check-detail">⚠️ 키는 지금 한 번만 보여집니다. 아래 요청문을 복사해 두세요.</div>
                </div>
              </div>

              <div className="step-title">① ChatGPT에 붙여넣을 요청문</div>
              <p className="small muted">화이트보드를 만든 ChatGPT 대화에 그대로 붙여넣으면, 포스트잇 저장 시 알림을 보내도록 수정해 줍니다.</p>
              <button className="btn block primary" onClick={() => copyText(chatgptPrompt(created.token, created.name), '요청문을 복사했습니다. ChatGPT에 붙여넣으세요.')}>
                📋 ChatGPT 요청문 복사
              </button>

              <div className="step-title">② 연결 확인</div>
              <button className="btn block" onClick={sendTest}>
                이 방에 테스트 메시지 보내기
              </button>

              <details>
                <summary className="small">코드만 보기 (직접 수정하는 경우)</summary>
                <pre className="code-box">{snippet(created.token)}</pre>
                <button className="btn small" onClick={() => copyText(snippet(created.token), '코드를 복사했습니다.')}>
                  코드 복사
                </button>
              </details>
            </div>
          )}

          <div className="step-title">연동 목록</div>
          {items === null && <p className="muted small">불러오는 중…</p>}
          {items && items.length === 0 && <p className="muted small">아직 연동이 없습니다.</p>}
          <ul className="integration-list">
            {(items || []).map((it) => (
              <li key={it.id}>
                <div>
                  <strong>📌 {it.name}</strong>
                  <div className="muted small">
                    발급 {formatListTime(it.created_at)} · {it.last_used_at ? `최근 수신 ${formatListTime(it.last_used_at)}` : '아직 수신 없음'}
                  </div>
                </div>
                <button className="btn small ghost danger" onClick={() => remove(it)}>
                  해제
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
