'use client'

import Image from 'next/image'
import { X, ArrowUp, ArrowDown, Sparkles } from 'lucide-react'
import { Property } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PropertyCompareProps {
  properties: Property[]
  onClose: () => void
  onViewDetail: (id: string) => void
}

export function PropertyCompare({ properties, onClose, onViewDetail }: PropertyCompareProps) {
  // 计算平均值
  const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length
  const avgArea = properties.reduce((sum, p) => sum + p.area, 0) / properties.length
  const avgPricePerSqm = properties.reduce((sum, p) => sum + p.pricePerSqm, 0) / properties.length

  // 比较指标
  const getCompareIndicator = (value: number, avg: number, isHigherBetter: boolean) => {
    const diff = value - avg
    if (Math.abs(diff) < avg * 0.05) return null // 差异小于5%不显示
    
    if (isHigherBetter) {
      return diff > 0 ? (
        <ArrowUp className="ml-1 inline h-3 w-3 text-[#00BFA5]" />
      ) : (
        <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
      )
    } else {
      return diff < 0 ? (
        <ArrowUp className="ml-1 inline h-3 w-3 text-[#00BFA5]" />
      ) : (
        <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
      )
    }
  }

  // AI推荐排序
  const rankedProperties = [...properties].sort((a, b) => {
    let scoreA = 0, scoreB = 0
    
    // 价格越低越好
    if (a.price < avgPrice) scoreA += 2
    if (b.price < avgPrice) scoreB += 2
    
    // 面积越大越好
    if (a.area > avgArea) scoreA += 1
    if (b.area > avgArea) scoreB += 1
    
    // 已看的加分
    if (a.status === 'viewed') scoreA += 1
    if (b.status === 'viewed') scoreB += 1
    
    // 收藏的加分
    if (a.isFavorite) scoreA += 1
    if (b.isFavorite) scoreB += 1
    
    return scoreB - scoreA
  })

  const compareFields = [
    { label: '总价', key: 'price', unit: '万', isHigherBetter: false },
    { label: '面积', key: 'area', unit: '㎡', isHigherBetter: true },
    { label: '单价', key: 'pricePerSqm', unit: '万/㎡', isHigherBetter: false },
    { label: '户型', key: 'layout', unit: '' },
    { label: '楼层', key: 'floor', unit: '' },
    { label: '朝向', key: 'orientation', unit: '' },
    { label: '装修', key: 'decoration', unit: '' },
    { label: '房龄', key: 'age', unit: '年', isHigherBetter: false },
  ]

  return (
    <div className="h-full overflow-auto p-6">
      {/* 关闭按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-20 z-10 rounded-full bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      <h2 className="mb-6 text-xl font-bold text-foreground">
        房源对比 ({properties.length}套)
      </h2>

      {/* 对比表格 */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border p-3 text-left text-sm font-medium text-muted-foreground">
                对比项
              </th>
              {properties.map((p) => (
                <th
                  key={p.id}
                  className="border-b border-border p-3 text-center"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => onViewDetail(p.id)}
                  >
                    <div className="relative mx-auto mb-2 h-20 w-32 overflow-hidden rounded-lg">
                      <Image
                        src={p.coverImage}
                        alt={p.name}
                        fill
                        className="object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="font-medium text-foreground hover:text-primary">
                      {p.name}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareFields.map((field) => (
              <tr key={field.key} className="hover:bg-muted/30">
                <td className="border-b border-border p-3 text-sm text-muted-foreground">
                  {field.label}
                </td>
                {properties.map((p) => {
                  const value = p[field.key as keyof Property]
                  const numValue = typeof value === 'number' ? value : null
                  const avg = field.key === 'price' ? avgPrice : 
                             field.key === 'area' ? avgArea : 
                             field.key === 'pricePerSqm' ? avgPricePerSqm : null
                  
                  return (
                    <td
                      key={p.id}
                      className="border-b border-border p-3 text-center"
                    >
                      <span className={field.key === 'price' ? 'font-bold text-primary' : ''}>
                        {value}
                        {field.unit}
                      </span>
                      {numValue !== null && avg !== null && field.isHigherBetter !== undefined && (
                        getCompareIndicator(numValue, avg, field.isHigherBetter)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* 标签行 */}
            <tr className="hover:bg-muted/30">
              <td className="border-b border-border p-3 text-sm text-muted-foreground">
                标签
              </td>
              {properties.map((p) => (
                <td key={p.id} className="border-b border-border p-3">
                  <div className="flex flex-wrap justify-center gap-1">
                    {p.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`text-xs ${
                          tag.includes('急售') || tag.includes('议价')
                            ? 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
            {/* 状态行 */}
            <tr className="hover:bg-muted/30">
              <td className="p-3 text-sm text-muted-foreground">状态</td>
              {properties.map((p) => (
                <td key={p.id} className="p-3 text-center">
                  <Badge
                    variant="secondary"
                    className={`${
                      p.status === 'viewed'
                        ? 'bg-[#00BFA5]/10 text-[#00BFA5]'
                        : p.status === 'pending'
                        ? 'bg-[#FFB800]/10 text-[#FFB800]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.status === 'viewed' ? '已看' : p.status === 'pending' ? '待看' : '已售'}
                  </Badge>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* AI对比建议 */}
      <Card className="border-primary/20 bg-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 推荐排序
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rankedProperties.map((p, index) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-background p-3"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                    index === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.price}万 · {p.area}㎡ · {p.layout}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:bg-secondary"
                  onClick={() => onViewDetail(p.id)}
                >
                  查看详情
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">推荐理由：</strong>
            综合考虑价格、面积、位置等因素，{rankedProperties[0]?.name} 
            性价比最高，建议优先考虑。
            {rankedProperties[0]?.tags.includes('可议价') && '且房东可议价，有进一步降价空间。'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
