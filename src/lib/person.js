// 기기 연결(v6): 같은 사람의 PC·휴대폰은 person_id가 같음. v6 SQL 전의 데이터는 user_id로 대신함
export const personOf = (member) => member?.person_id ?? member?.user_id
export const senderOf = (msg) => msg.sender_person ?? msg.user_id

// 방 참여자(기기별 행)를 사람별로 묶음: 읽은 위치는 가장 많이 읽은 기기, 들어온 시각은 가장 먼저 들어온 기기
export function groupPeople(members) {
  const byPerson = new Map()
  for (const m of members) {
    const id = personOf(m)
    const p = byPerson.get(id)
    if (!p) {
      byPerson.set(id, { ...m, person_id: id, devices: 1 })
      continue
    }
    p.devices += 1
    if (m.last_read_id > p.last_read_id) p.last_read_id = m.last_read_id
    if (m.joined_at < p.joined_at) p.joined_at = m.joined_at
    p.is_admin = p.is_admin || m.is_admin
    p.muted = p.muted || m.muted
  }
  return [...byPerson.values()]
}
