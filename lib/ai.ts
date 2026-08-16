import { ColumnConfig, PropertyMode } from '@/types/property'
import { getSupabase } from '@/lib/supabase'

// 从截图中提取的房源数据
export interface ParsedProperty {
  name?: string
  roomNumber?: string
  price?: number
  pricePerSqm?: number
  layout?: string
  area?: number
  district?: string
  floor?: string
  orientation?: string
  decoration?: string
  age?: number
  tags?: string[]
  customFields?: Record<string, string | number>
}

export async function parseScreenshot(
  imageBase64: string,
  mimeType: string,
  customColumns: ColumnConfig[],
  mode: PropertyMode = 'buy',
): Promise<ParsedProperty> {
  const safeCustomColumns = customColumns
    .filter(column => column.isCustom)
    .slice(0, 30)
    .map(column => ({
      key: column.key,
      label: column.label,
      type: column.type || 'text',
    }))
  const { data: { session } } = await getSupabase().auth.getSession()

  if (!session?.access_token) {
    throw new Error('登录已过期，请重新登录')
  }

  const res = await fetch('/api/parse-screenshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ imageBase64, mimeType, customColumns: safeCustomColumns, mode }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '识别失败，请重试')
  }

  const data = await res.json()
  return data.property as ParsedProperty
}
