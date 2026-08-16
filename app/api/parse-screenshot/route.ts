import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// 截图在客户端压缩到 2MB 左右，服务端再限制编码后的请求大小。
export const runtime = 'nodejs'

const customColumnSchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().trim().min(1).max(60),
  type: z.enum(['text', 'number', 'date']).default('text'),
})

const requestSchema = z.object({
  imageBase64: z.string().min(1).max(3 * 1024 * 1024),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  customColumns: z.array(customColumnSchema).max(30).default([]),
  mode: z.enum(['buy', 'rent']).default('buy'),
})

const propertySchema = z.object({
  name: z.string().max(100).optional(),
  roomNumber: z.string().max(100).optional(),
  price: z.number().nonnegative().optional(),
  pricePerSqm: z.number().nonnegative().optional(),
  layout: z.string().max(100).optional(),
  area: z.number().nonnegative().optional(),
  district: z.string().max(100).optional(),
  floor: z.string().max(100).optional(),
  orientation: z.string().max(100).optional(),
  decoration: z.string().max(100).optional(),
  age: z.number().nonnegative().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  customFields: z.record(
    z.string().max(80),
    z.union([z.string().max(500), z.number().finite()]),
  ).refine(value => Object.keys(value).length <= 30).optional(),
})

function isExpectedImage(buffer: Buffer, mimeType: z.infer<typeof requestSchema>['mimeType']) {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (mimeType === 'image/png') {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return buffer.length >= pngSignature.length && pngSignature.every((byte, index) => buffer[index] === byte)
  }

  return buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
}

function buildSchemaPrompt(
  customColumns: z.infer<typeof customColumnSchema>[],
  mode: 'buy' | 'rent',
) {
  const isBuy = mode === 'buy'
  const builtinFields = [
    ['name', 'string', '小区名称'],
    ['roomNumber', 'string', '房号（如39-1201代表39栋1201房间）'],
    ['price', 'number', isBuy ? '总价（万元）' : '月租金（元/月）'],
    ['pricePerSqm', 'number', isBuy ? '单价（万元/平米）' : '每平米月租（元/平米/月）'],
    ['layout', 'string', '户型（如3室2厅1卫）'],
    ['area', 'number', '面积（平方米）'],
    ['district', 'string', '区域'],
    ['floor', 'string', '楼层（如15/28层）'],
    ['orientation', 'string', '朝向'],
    ['decoration', 'string', '装修情况'],
    ['age', 'number', '房龄（年）'],
    ['tags', 'string[]', '标签（数组，如采光好、南北通透）'],
  ]

  const lines = [
    '内置字段：',
    ...builtinFields.map(([key, type, label]) => `- ${key} (${type}): ${label}`),
  ]

  if (customColumns.length > 0) {
    lines.push('', '用户自定义字段（放在 customFields 对象中）：')
    customColumns.forEach(column => {
      lines.push(`- ${column.key} (${column.type}): ${column.label}`)
    })
  }

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return NextResponse.json({ error: '请先登录后再使用截图识别' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > 4 * 1024 * 1024) {
    return NextResponse.json({ error: '图片过大，请压缩后重试' }, { status: 413 })
  }

  let parsedBody: z.infer<typeof requestSchema>
  try {
    parsedBody = requestSchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: '请求格式错误，请重试' },
      { status: 400 },
    )
  }

  const { imageBase64, mimeType, customColumns, mode } = parsedBody
  if (imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return NextResponse.json({ error: '图片数据无效，请重新选择图片' }, { status: 400 })
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64')
  if (imageBuffer.length === 0 || !isExpectedImage(imageBuffer, mimeType)) {
    return NextResponse.json({ error: '图片格式与文件内容不一致' }, { status: 400 })
  }

  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (!baseUrl || !apiKey || !model) {
    console.error('Screenshot parser AI configuration is incomplete')
    return NextResponse.json(
      { error: '识别服务暂时不可用，请稍后重试' },
      { status: 503 },
    )
  }

  const { data: quotaGranted, error: quotaError } = await supabase.rpc('claim_screenshot_parse')
  if (quotaError) {
    console.error('Screenshot quota check failed:', quotaError.code || 'unknown')
    return NextResponse.json({ error: '识别服务暂时不可用，请稍后重试' }, { status: 503 })
  }
  if (!quotaGranted) {
    return NextResponse.json({ error: '今天的识别次数已用完，请稍后再试或手动添加' }, { status: 429 })
  }

  const isBuy = mode !== 'rent'
  const modeLabel = isBuy ? '买房' : '租房'
  const priceHint = isBuy ? '总价（万元）' : '月租金（元/月）'
  const pricePerSqmHint = isBuy ? '单价（万元/平米）' : '每平米月租（元/平米/月）'
  const schemaPrompt = buildSchemaPrompt(customColumns, mode)

  const systemPrompt = `你是一个${modeLabel}信息提取助手。用户会上传${modeLabel}截图（来自贝壳、链家、安居客、自如、蛋壳等平台），你需要从中提取结构化的房源数据。

请严格按以下字段 schema 提取，只返回 JSON，不要返回其他内容。
如果某个字段在截图中找不到，就不要包含该字段。
数字类型的字段请返回数字而非字符串。
price 字段为${priceHint}，pricePerSqm 字段为${pricePerSqmHint}。
tags 字段请提取房源的亮点或特点，作为字符串数组。

${schemaPrompt}

返回格式示例：
{
  "name": "万科金域华府",
  "roomNumber": "39-1201",
  "price": 520,
  "layout": "3室2厅2卫",
  "area": 100,
  "tags": ["采光好", "南北通透"]
}`

  try {
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: '请从这张截图中提取房源信息，只返回 JSON。',
            },
          ],
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
    }

    const aiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })

    if (!aiRes.ok) {
      console.error('AI API error:', aiRes.status)
      return NextResponse.json(
        { error: `AI 服务返回错误 (${aiRes.status})` },
        { status: 502 },
      )
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || ''

    // 从返回内容中提取 JSON（可能被 ```json ``` 包裹）
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: '无法从截图中识别房源信息' },
        { status: 422 },
      )
    }

    const property = propertySchema.parse(JSON.parse(jsonMatch[0]))
    return NextResponse.json({ property })
  } catch (err) {
    const errorName = err instanceof Error ? err.name : 'UnknownError'
    console.error('parse-screenshot error:', errorName)
    if (errorName === 'TimeoutError') {
      return NextResponse.json(
        { error: '识别超时，请稍后重试' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: '识别过程出错，请重试' },
      { status: 500 },
    )
  }
}
