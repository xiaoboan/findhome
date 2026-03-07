import { getSupabase } from './supabase'

const BUCKET = 'property-images'

/**
 * 上传图片到 Supabase Storage
 * 路径格式: {userId}/{propertyId}/{timestamp}-{filename}
 */
export async function uploadImage(
  file: File,
  userId: string,
  propertyId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${propertyId}/${Date.now()}.${ext}`

  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = getSupabase().storage
    .from(BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * 从 Supabase Storage 删除图片
 * 从完整 URL 提取路径后删除
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return // 不是 storage URL（可能是旧的 unsplash），跳过

  const path = publicUrl.slice(idx + marker.length)
  await getSupabase().storage.from(BUCKET).remove([path])
}
