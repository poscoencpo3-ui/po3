import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCode } from '../lib/format'
import { toast } from '../lib/toast'
import Avatar from './Avatar'

const MERGE_ERRORS = {
  NOT_ALLOWED: '관리자만 묶을 수 있습니다.',
  ADMIN_MUST_BE_TARGET: '관리자는 대표로만 묶을 수 있습니다.',
  TWO_ADMINS: '관리자 두 명은 한 사람으로 묶을 수 없습니다.',
  NOTHING_TO_MERGE: '두 명 이상 골라 주세요.',
  UNKNOWN_PERSON: '참여자 정보가 바뀌었습니다. 목록을 다시 열어 주세요.',
}
const errorText = (error, fallback) => {
  const key = Object.keys(MERGE_ERRORS).find((k) => error.message.includes(k))
  return key ? MERGE_ERRORS[key] : fallback
}
const label = (m) => m.display_name + (m.company ? ` (${m.company})` : '')
// 이름이 같은 참여자를 구별하도록 처음 들어온 때를 보여줌
function joinedText(at) {
  const d = new Date(at)
  const p = (n) => String(n).padStart(2, '0')
  return `처음 입장 ${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// members: 사람별로 묶은 참여자, me: 내 사람 번호
export default function MembersPanel({ room, members, me, isAdmin, colorOf, onCopyInvite, onChanged, onClose }) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([]) // 고른 순서대로 사람 번호
  const [merging, setMerging] = useState(null) // 묶기 확인 창에 보일 사람들
  const [busy, setBusy] = useState(false)

  const sorted = [...members].sort(
    (a, b) => (b.person_id === me) - (a.person_id === me) || b.is_admin - a.is_admin || a.display_name.localeCompare(b.display_name, 'ko')
  )

  // 이름·소속이 같은 참여자가 여러 명이면 묶기 추천 (관리자만)
  const suggestions = useMemo(() => {
    if (!isAdmin) return []
    const groups = new Map()
    for (const m of members) {
      const key = `${m.display_name.trim()}|${(m.company || '').trim()}`
      groups.set(key, [...(groups.get(key) || []), m])
    }
    return [...groups.values()].filter((g) => g.length > 1 && g.filter((m) => m.is_admin).length <= 1)
  }, [members, isAdmin])

  function toggle(personId) {
    setSelected((prev) => (prev.includes(personId) ? prev.filter((x) => x !== personId) : [...prev, personId]))
  }

  function stopSelecting() {
    setSelecting(false)
    setSelected([])
  }

  async function merge(target, others) {
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_merge_people', { p_target: target, p_others: others })
    setBusy(false)
    if (error) return toast(errorText(error, '묶기에 실패했습니다. (v7 SQL을 실행했는지 확인해 주세요)'))
    toast(`${data.merged + 1}명을 '${data.name}' 한 사람으로 묶었습니다.`)
    setMerging(null)
    stopSelecting()
    onChanged()
  }

  async function split(m) {
    if (!window.confirm(`'${label(m)}'의 묶음을 풀까요?\n기기 ${m.devices}대가 다시 각각 따로 보이고, 묶으면서 생긴 방은 다시 빠집니다.`)) return
    const { data, error } = await supabase.rpc('admin_split_person', { p_person: m.person_id })
    if (error) return toast(errorText(error, '묶음 풀기에 실패했습니다. (v7 SQL을 실행했는지 확인해 주세요)'))
    toast(data ? `묶음을 풀었습니다. (${data + 1}명으로)` : '이 참여자는 묶여 있지 않습니다.')
    onChanged()
  }

  const byId = new Map(members.map((m) => [m.person_id, m]))

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer members-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>참여자 {members.length}명</strong>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className="invite-box">
          <div className="muted small">입장코드</div>
          <div className="invite-code">{formatCode(room.code)}</div>
          <button className="btn small block" onClick={onCopyInvite}>
            초대 안내문 복사
          </button>
        </div>

        {isAdmin && (
          <div className="merge-tools">
            {!selecting && suggestions.length > 0 && (
              <div className="merge-suggest">
                <div className="small">
                  <b>같은 이름·소속이 여러 명 있습니다</b>
                  <span className="muted"> (기기를 바꿔 다시 들어온 경우)</span>
                </div>
                {suggestions.map((g) => (
                  <div key={g[0].person_id} className="merge-suggest-row">
                    <span>
                      {label(g[0])} <b>{g.length}명</b>
                    </span>
                    <button className="btn small" onClick={() => setMerging(g)}>
                      묶기
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selecting ? (
              <div className="merge-bar">
                <span className="small">한 사람으로 묶을 참여자를 고르세요</span>
                <button className="btn small ghost" onClick={stopSelecting}>
                  취소
                </button>
              </div>
            ) : (
              <button className="btn small ghost block" onClick={() => setSelecting(true)}>
                👥 동일인 묶기 (직접 고르기)
              </button>
            )}
          </div>
        )}

        <ul className="member-list">
          {sorted.map((m) => (
            <li
              key={m.person_id}
              className={selecting ? 'selectable' + (selected.includes(m.person_id) ? ' selected' : '') : ''}
              onClick={selecting ? () => toggle(m.person_id) : undefined}
            >
              {selecting && <input type="checkbox" readOnly checked={selected.includes(m.person_id)} aria-label={`${label(m)} 선택`} />}
              <Avatar name={m.display_name} seed={m.user_id} size={36} color={colorOf?.(m.person_id)[1]} />
              <div className="member-main">
                <div>
                  {m.display_name}
                  {m.person_id === me && <span className="me-tag">나</span>}
                  {m.is_admin && <span className="admin-tag">관리자</span>}
                  {m.devices > 1 && <span className="member-devices muted">기기 {m.devices}대</span>}
                </div>
                {m.company && <div className="muted small">{m.company}</div>}
                {selecting && <div className="muted small">{joinedText(m.joined_at)}</div>}
              </div>
              {isAdmin && !selecting && m.devices > 1 && (
                <button className="btn small ghost split-btn" onClick={() => split(m)}>
                  묶음 풀기
                </button>
              )}
            </li>
          ))}
        </ul>

        {selecting && (
          <div className="merge-footer">
            <button
              className="btn primary block"
              disabled={selected.length < 2}
              onClick={() => setMerging(selected.map((id) => byId.get(id)).filter(Boolean))}
            >
              {selected.length < 2 ? '두 명 이상 고르세요' : `선택한 ${selected.length}명을 한 사람으로 묶기`}
            </button>
          </div>
        )}
      </aside>

      {merging && <MergeModal people={merging} busy={busy} onMerge={merge} onClose={() => setMerging(null)} />}
    </div>
  )
}

// 대표(이름·소속을 남길 사람)를 고르고 묶기
function MergeModal({ people, busy, onMerge, onClose }) {
  const admins = people.filter((m) => m.is_admin)
  const [target, setTarget] = useState((admins[0] || people[0]).person_id)
  const others = people.map((m) => m.person_id).filter((id) => id !== target)

  return (
    <div className="modal-backdrop" onClick={(e) => (e.stopPropagation(), onClose())}>
      <div className="modal form-modal merge-modal" onClick={(e) => e.stopPropagation()}>
        <h3>👥 동일인으로 묶기</h3>
        <div className="form-scroll">
          <p className="small">
            <b>{people.length}명</b>을 한 사람으로 합칩니다. 남길 <b>대표 이름</b>을 고르세요.
          </p>
          <ul className="merge-choices">
            {people.map((m) => (
              <li key={m.person_id}>
                <label className={admins.length && !m.is_admin ? 'disabled' : ''}>
                  <input
                    type="radio"
                    name="merge-target"
                    checked={target === m.person_id}
                    disabled={admins.length > 0 && !m.is_admin}
                    onChange={() => setTarget(m.person_id)}
                  />
                  <span>
                    {label(m)}
                    {m.is_admin && <span className="admin-tag">관리자</span>}
                    {m.devices > 1 && <span className="member-devices muted">기기 {m.devices}대</span>}
                    <span className="muted small merge-joined">{joinedText(m.joined_at)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {admins.length > 1 && <p className="error">관리자 두 명은 한 사람으로 묶을 수 없습니다.</p>}
          <ul className="muted small merge-notes">
            <li>모든 채팅방에서 한 사람으로 보이고, 인원수와 읽음 숫자도 한 명으로 셉니다.</li>
            <li>방 목록·읽음·알림 설정이 합쳐지고, 지난 메시지도 대표 이름으로 바뀝니다.</li>
            <li>잘못 묶었으면 참여자 목록의 <b>묶음 풀기</b>로 되돌릴 수 있습니다.</li>
          </ul>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" disabled={busy || admins.length > 1} onClick={() => onMerge(target, others)}>
            {busy ? '묶는 중…' : '묶기'}
          </button>
        </div>
      </div>
    </div>
  )
}
