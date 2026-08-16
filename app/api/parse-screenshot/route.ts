import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// 截图在客户端压缩到 2MB 左右，服务端再限制编码后的请求大小。
export const runtime = 'nodejs'

const requestSchema = z.object({
  imageBase64: z.string().min(1).max(3 * 1024 * 1024),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  schemaPrompt: z.string().max(6000),
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
  customFields: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(userId: string) {
  const now = Date.now()
  const current = rateLimitStore.get(userId)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + 60_000 })
    return false
  }
  current.count += 1
  return current.count > 10
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
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: '识别请求过于频繁，请一分钟后再试' }, { status: 429 })
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

  const { imageBase64, mimeType, schemaPrompt, mode } = parsedBody

  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json(
      { error: '未配置 AI 服务，请在 .env.local 中设置 AI_BASE_URL、AI_API_KEY、AI_MODEL' },
      { status: 500 },
    )
  }

  const isBuy = mode !== 'rent'
  const modeLabel = isBuy ? '买房' : '租房'
  const priceHint = isBuy ? '总价（万元）' : '月租金（元/月）'
  const pricePerSqmHint = isBuy ? '单价（万元/平米）' : '每平米月租（元/平米/月）'

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
      const errText = await aiRes.text()
      console.error('AI API error:', aiRes.status, errText)
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
    console.error('parse-screenshot error:', err)
    return NextResponse.json(
      { error: '识别过程出错，请重试' },
      { status: 500 },
    )
  }
}
