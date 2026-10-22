// 랭킹: Supabase가 있으면 모두가 함께 보는 랭킹, 없으면 이 기기에만 저장
import { online, supabase } from './net.js'
import { local } from './store.js'

const LOCAL = 'slime.runs'

function localRuns() {
  try {
    return JSON.parse(local.get(LOCAL)) || []
  } catch {
    return []
  }
}

// 랭킹 칸 이름: 맵-단계 (예: saebom-2)
export const rankKey = (map, level) => `${map}-${level}`

export function calcPoints(time, place, stats = {}, level = 1) {
  const timeBonus = Math.max(0, Math.round((90 - time) * 8))
  const placeBonus = place ? [0, 300, 200, 100, 50][place] ?? 30 : 0
  const bonus = (stats.stars || 0) * 15 + (stats.perfect || 0) * 5 + (stats.bestCombo || 0) * 3
  return Math.round((100 + timeBonus + placeBonus + bonus) * (1 + (level - 1) * 0.25))
}

export function starsFor(time) {
  return time < 15 ? 3 : time < 30 ? 2 : 1
}

export async function saveRun(run) {
  const row = { ...run, created_at: new Date().toISOString() }
  const list = localRuns()
  list.push(row)
  local.set(LOCAL, JSON.stringify(list.slice(-300)))
  if (!online) return
  const { error } = await supabase.from('slime_runs').insert({
    map: run.map,
    name: run.name,
    avatar: run.avatar,
    time_ms: run.time_ms,
    points: run.points,
    mode: run.mode,
  })
  if (error) console.warn('랭킹 저장 실패', error.message)
}

function bestPerName(rows) {
  const best = new Map()
  for (const r of rows) {
    const b = best.get(r.name)
    if (!b || r.time_ms < b.time_ms) best.set(r.name, r)
  }
  return [...best.values()].sort((a, b) => a.time_ms - b.time_ms).slice(0, 20)
}

export async function topTimes(map) {
  if (online) {
    const { data, error } = await supabase
      .from('slime_runs')
      .select('name, avatar, time_ms, created_at')
      .eq('map', map)
      .order('time_ms', { ascending: true })
      .limit(200)
    if (!error) return bestPerName(data)
  }
  return bestPerName(localRuns().filter((r) => r.map === map))
}

export async function topPoints() {
  if (online) {
    const { data, error } = await supabase
      .from('slime_points')
      .select('name, avatar, total, plays')
      .order('total', { ascending: false })
      .limit(20)
    if (!error) return data
  }
  const sum = new Map()
  for (const r of localRuns()) {
    const s = sum.get(r.name) || { name: r.name, avatar: r.avatar, total: 0, plays: 0 }
    s.total += r.points
    s.plays++
    s.avatar = r.avatar
    sum.set(r.name, s)
  }
  return [...sum.values()].sort((a, b) => b.total - a.total).slice(0, 20)
}

export async function myBest(map, name) {
  const list = await topTimes(map)
  return list.find((r) => r.name === name)?.time_ms
}
