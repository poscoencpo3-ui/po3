// 랭킹: Supabase가 있으면 모두가 함께 보는 랭킹, 없으면 이 기기에만 저장
import { online, supabase } from './net.js'
import { local } from './store.js'

const LOCAL = 'piano.runs'

function localRuns() {
  try {
    return JSON.parse(local.get(LOCAL)) || []
  } catch {
    return []
  }
}

export async function saveRun(run) {
  const list = localRuns()
  list.push({ ...run, created_at: new Date().toISOString() })
  local.set(LOCAL, JSON.stringify(list.slice(-400)))
  if (!online) return
  const { error } = await supabase.from('piano_scores').insert({
    song: run.song,
    name: run.name,
    avatar: run.avatar,
    score: run.score,
    max_combo: run.max_combo,
    grade: run.grade,
    perfect: run.perfect,
    good: run.good,
    bad: run.bad,
    miss: run.miss,
    mode: run.mode,
  })
  if (error) console.warn('랭킹 저장 실패', error.message)
}

function bestPerName(rows) {
  const best = new Map()
  for (const r of rows) {
    const b = best.get(r.name)
    if (!b || r.score > b.score) best.set(r.name, r)
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 20)
}

export async function topScores(song) {
  if (online) {
    const { data, error } = await supabase
      .from('piano_scores')
      .select('name, avatar, score, max_combo, grade')
      .eq('song', song)
      .order('score', { ascending: false })
      .limit(200)
    if (!error) return bestPerName(data)
  }
  return bestPerName(localRuns().filter((r) => r.song === song))
}

export async function topPoints() {
  if (online) {
    const { data, error } = await supabase
      .from('piano_points')
      .select('name, avatar, total, plays')
      .order('total', { ascending: false })
      .limit(20)
    if (!error) return data
  }
  const sum = new Map()
  for (const r of localRuns()) {
    const s = sum.get(r.name) || { name: r.name, avatar: r.avatar, total: 0, plays: 0 }
    s.total += r.score
    s.plays++
    s.avatar = r.avatar
    sum.set(r.name, s)
  }
  return [...sum.values()].sort((a, b) => b.total - a.total).slice(0, 20)
}

// 이 기기에서 곡별 내 최고 점수
export function myBestLocal(song, name) {
  let best = 0
  for (const r of localRuns()) if (r.song === song && r.name === name) best = Math.max(best, r.score)
  return best
}
