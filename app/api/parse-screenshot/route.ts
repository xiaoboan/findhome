import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType, schemaPrompt } = await req.json()

  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json(
      { error: '未配置 AI 服务，请在 .env.local 中设置 AI_BASE_URL、AI_API_KEY、AI_MODEL' },
      { status: 500 },
    )
  }

  const systemPrompt = `你是一个房产信息提取助手。用户会上传房源截图（来自贝壳、链家、安居客等平台），你需要从中提取结构化的房源数据。

请严格按以下字段 schema 提取，只返回 JSON，不要返回其他内容。
如果某个字段在截图中找不到，就不要包含该字段。
数字类型的字段请返回数字而非字符串。
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

    const property = JSON.parse(jsonMatch[0])
    return NextResponse.json({ property })
  } catch (err) {
    console.error('parse-screenshot error:', err)
    return NextResponse.json(
      { error: '识别过程出错，请重试' },
      { status: 500 },
    )
  }
}
