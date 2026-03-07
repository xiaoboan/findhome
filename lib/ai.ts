import { ColumnConfig } from '@/types/property'

// 从截图中提取的房源数据
export interface ParsedProperty {
  name?: string
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

// 构建 schema 描述，让模型知道要提取哪些字段
function buildSchemaPrompt(customColumns: ColumnConfig[]): string {
  const builtinFields = [
    { key: 'name', label: '小区名称', type: 'string' },
    { key: 'price', label: '总价（万元）', type: 'number' },
    { key: 'pricePerSqm', label: '单价（万元/平米）', type: 'number' },
    { key: 'layout', label: '户型（如3室2厅1卫）', type: 'string' },
    { key: 'area', label: '面积（平方米）', type: 'number' },
    { key: 'district', label: '区域', type: 'string' },
    { key: 'floor', label: '楼层（如15/28层）', type: 'string' },
    { key: 'orientation', label: '朝向', type: 'string' },
    { key: 'decoration', label: '装修情况', type: 'string' },
    { key: 'age', label: '房龄（年）', type: 'number' },
    { key: 'tags', label: '标签（数组，如采光好、南北通透）', type: 'string[]' },
  ]

  const customFields = customColumns
    .filter(col => col.isCustom)
    .map(col => ({
      key: col.key,
      label: col.label,
      type: col.type || 'text',
    }))

  let prompt = '内置字段：\n'
  for (const f of builtinFields) {
    prompt += `- ${f.key} (${f.type}): ${f.label}\n`
  }

  if (customFields.length > 0) {
    prompt += '\n用户自定义字段（放在 customFields 对象中）：\n'
    for (const f of customFields) {
      prompt += `- ${f.key} (${f.type}): ${f.label}\n`
    }
  }

  return prompt
}

export async function parseScreenshot(
  imageBase64: string,
  mimeType: string,
  customColumns: ColumnConfig[],
): Promise<ParsedProperty> {
  const schemaPrompt = buildSchemaPrompt(customColumns)

  const res = await fetch('/api/parse-screenshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, schemaPrompt }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || '识别失败，请重试')
  }

  const data = await res.json()
  return data.property as ParsedProperty
}
