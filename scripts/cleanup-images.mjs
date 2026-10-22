// 보관 기간이 지난 사진·파일과 삭제된 메시지의 첨부를 Storage 에서 지웁니다.
// GitHub Actions 에서 매일 실행됩니다 (.github/workflows/cleanup-images.yml).
// 매일 Supabase 에 접속하므로, 무료 프로젝트가 7일 비활성으로 일시정지되는 것도 막아줍니다.
//
// 필요한 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (선택: RETENTION_DAYS, 기본 90)
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const retentionDays = Number(process.env.RETENTION_DAYS || 90)
const BATCH = 100

if (!url || !serviceKey) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

// 보관 기간이 지난 사진/파일: Storage 에서 지우고 메시지에 만료 표시
async function expire(kind, column, bucket) {
  let total = 0
  for (;;) {
    const { data: rows, error } = await supabase
      .from('messages')
      .select(`id, ${column}`)
      .eq('kind', kind)
      .eq('image_expired', false)
      .not(column, 'is', null)
      .lt('created_at', cutoff)
      .order('id')
      .limit(BATCH)
    if (error) throw error
    if (!rows.length) return total

    const { error: removeError } = await supabase.storage.from(bucket).remove(rows.map((r) => r[column]))
    if (removeError) throw removeError
    const { error: updateError } = await supabase
      .from('messages')
      .update({ image_expired: true })
      .in('id', rows.map((r) => r.id))
    if (updateError) throw updateError
    total += rows.length
  }
}

// 사용자가 삭제한 메시지의 사진/파일
async function emptyTrash() {
  let total = 0
  for (;;) {
    const { data: rows, error } = await supabase.from('storage_trash').select('*').order('id').limit(BATCH)
    if (error) throw error
    if (!rows.length) return total
    for (const bucket of new Set(rows.map((r) => r.bucket))) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(rows.filter((r) => r.bucket === bucket).map((r) => r.path))
      if (removeError) throw removeError
    }
    const { error: deleteError } = await supabase.from('storage_trash').delete().in('id', rows.map((r) => r.id))
    if (deleteError) throw deleteError
    total += rows.length
  }
}

const images = await expire('image', 'image_path', 'chat-images')
const files = await expire('file', 'file_path', 'chat-files')
const trash = await emptyTrash()
console.log(`${retentionDays}일 지난 사진 ${images}장, 파일 ${files}개 정리 / 삭제된 메시지의 첨부 ${trash}개 정리 완료`)
