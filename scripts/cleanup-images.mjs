// 보관 기간이 지난 사진을 Storage 에서 지우고, 메시지에는 "삭제됨" 표시를 남깁니다.
// GitHub Actions 에서 매일 실행됩니다 (.github/workflows/cleanup-images.yml).
// 매일 Supabase 에 접속하므로, 무료 프로젝트가 7일 비활성으로 일시정지되는 것도 막아줍니다.
//
// 필요한 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (선택: RETENTION_DAYS, 기본 90)
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const retentionDays = Number(process.env.RETENTION_DAYS || 90)
const BUCKET = 'chat-images'
const BATCH = 100

if (!url || !serviceKey) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

let total = 0
for (;;) {
  const { data: rows, error } = await supabase
    .from('messages')
    .select('id, image_path')
    .eq('kind', 'image')
    .eq('image_expired', false)
    .lt('created_at', cutoff)
    .order('id')
    .limit(BATCH)
  if (error) throw error
  if (!rows.length) break

  const { error: removeError } = await supabase.storage.from(BUCKET).remove(rows.map((r) => r.image_path))
  if (removeError) throw removeError

  const { error: updateError } = await supabase
    .from('messages')
    .update({ image_expired: true })
    .in('id', rows.map((r) => r.id))
  if (updateError) throw updateError

  total += rows.length
}

console.log(`${retentionDays}일 지난 사진 ${total}장 정리 완료`)
