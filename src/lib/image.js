const MAX_SIDE = 2560
const QUALITY = 0.88

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

// 사진/캡쳐를 전송 전에 줄입니다. 캡쳐 속 글씨가 깨지지 않게 화질은 높게 유지합니다.
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // 움직이는 GIF 는 그대로 보냄
  if (file.type === 'image/gif') {
    bitmap.close()
    return { blob: file, type: file.type, width, height }
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // 투명 배경 PNG 를 JPEG 로 바꿀 때 검게 나오지 않도록
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  let blob = await canvasToBlob(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg')

  const originalOk = scale === 1 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  if (originalOk && file.size <= blob.size) {
    return { blob: file, type: file.type, width, height }
  }
  return { blob, type: blob.type, width: w, height: h }
}

export function extensionFor(type) {
  return { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[type] || 'img'
}

export function imageFilesFrom(list) {
  return Array.from(list || []).filter((f) => f.type && f.type.startsWith('image/'))
}
