import { getSupabase } from './supabase'
import {
  createStorageReference,
  getStoragePath,
  PROPERTY_IMAGE_BUCKET,
} from './storage-reference'

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24
const SIGNED_URL_CACHE_MS = 23 * 60 * 60 * 1000

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

function rememberSignedUrl(path: string, url: string) {
  const reference = createStorageReference(path)
  signedUrlCache.set(reference, {
    url,
    expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
  })
  return url
}

export async function resolveStoredImageUrls(values: string[]) {
  const resolved = new Map(values.map(value => [value, value]))
  const valuesByReference = new Map<string, { path: string; values: string[] }>()

  for (const value of values) {
    const path = getStoragePath(value)
    if (!path) continue

    const reference = createStorageReference(path)
    const cached = signedUrlCache.get(reference)
    if (cached && cached.expiresAt > Date.now()) {
      resolved.set(value, cached.url)
      continue
    }

    const existing = valuesByReference.get(reference)
    if (existing) {
      existing.values.push(value)
    } else {
      valuesByReference.set(reference, { path, values: [value] })
    }
  }

  await Promise.all(
    Array.from(valuesByReference.values()).map(async ({ path, values: sourceValues }) => {
      const { data, error } = await getSupabase().storage
        .from(PROPERTY_IMAGE_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

      if (error || !data?.signedUrl) {
        console.error('私有图片访问地址生成失败:', error?.message || 'unknown error')
        return
      }

      const signedUrl = rememberSignedUrl(path, data.signedUrl)
      sourceValues.forEach(value => resolved.set(value, signedUrl))
    })
  )

  return resolved
}

/**
 * 上传图片到 Supabase Storage。
 * 数据库存对象引用，界面只使用短期签名 URL。
 */
export async function uploadImage(
  file: File,
  userId: string,
  propertyId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${propertyId}/${Date.now()}.${ext}`
  const storage = getSupabase().storage.from(PROPERTY_IMAGE_BUCKET)

  const { error: uploadError } = await storage.upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data, error: signError } = await storage.createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signError || !data?.signedUrl) {
    await storage.remove([path])
    throw signError || new Error('图片访问地址生成失败')
  }

  return rememberSignedUrl(path, data.signedUrl)
}

/** 删除公开旧 URL、签名 URL 或 storage:// 引用对应的对象。 */
export async function deleteImage(imageValue: string): Promise<void> {
  const path = getStoragePath(imageValue)
  if (!path) return

  const { error } = await getSupabase().storage.from(PROPERTY_IMAGE_BUCKET).remove([path])
  if (error) throw error

  const reference = createStorageReference(path)
  signedUrlCache.delete(reference)
}
