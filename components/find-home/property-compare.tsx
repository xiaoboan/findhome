'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { X, ArrowUp, ArrowDown, ListChecks, Settings2, Plus, Trash2, ImageIcon } from 'lucide-react'
import { Property, PropertyMode, CompareColumnConfig, DEFAULT_COMPARE_COLUMNS, ColumnConfig } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface PropertyCompareProps {
  properties: Property[]
  customColumns?: ColumnConfig[]
  propertyMode?: PropertyMode
  onClose: () => void
  onViewDetail: (id: string) => void
}

interface DifferenceSummaryItem {
  label: string
  property: Property
  value: string
}

export function PropertyCompare({ properties, customColumns = [], propertyMode = 'buy', onClose, onViewDetail }: PropertyCompareProps) {
  // 合并默认列和自定义列
  const initialCompareColumns = useMemo(() => {
    // 根据模式调整默认列单位
    const modeColumns = DEFAULT_COMPARE_COLUMNS.map(col => {
      if (propertyMode === 'rent') {
        if (col.key === 'price') return { ...col, label: '月租', unit: '元/月' }
        if (col.key === 'pricePerSqm') return { ...col, label: '单价', unit: '元/㎡/月' }
      }
      return col
    })
    // 从传入的自定义列创建对比列配置
    const customCompareColumns: CompareColumnConfig[] = customColumns.map(col => ({
      key: col.key,
      label: col.label,
      visible: true,
      isCustom: true,
    }))
    
    // 同时从房源数据中提取自定义字段
    const customFieldsFromData = new Set<string>()
    properties.forEach(p => {
      if (p.customFields) {
        Object.keys(p.customFields).forEach(key => customFieldsFromData.add(key))
      }
    })
    
    // 添加数据中存在但不在自定义列中的字段
    const existingKeys = new Set([
      ...modeColumns.map(c => c.key),
      ...customCompareColumns.map(c => c.key)
    ])
    
    const additionalColumns: CompareColumnConfig[] = Array.from(customFieldsFromData)
      .filter(key => !existingKeys.has(key))
      .map(key => ({
        key,
        label: key.replace('custom_', ''),
        visible: true,
        isCustom: true,
      }))
    
    return [...modeColumns, ...customCompareColumns, ...additionalColumns]
  }, [customColumns, properties, propertyMode])

  const [compareColumns, setCompareColumns] = useState<CompareColumnConfig[]>(initialCompareColumns)
  
  // 当 initialCompareColumns 变化时更新
  useEffect(() => {
    setCompareColumns(prev => {
      // 保留用户的可见性设置
      const visibilityMap = new Map(prev.map(col => [col.key, col.visible]))
      return initialCompareColumns.map(col => ({
        ...col,
        visible: visibilityMap.has(col.key) ? visibilityMap.get(col.key)! : col.visible
      }))
    })
  }, [initialCompareColumns])

  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [newColumnKey, setNewColumnKey] = useState('')
  const [newColumnLabel, setNewColumnLabel] = useState('')
  const [newColumnUnit, setNewColumnUnit] = useState('')

  const averagePositive = (values: number[]) => {
    const validValues = values.filter(value => Number.isFinite(value) && value > 0)
    if (validValues.length === 0) return 0
    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
  }

  // 只把大于 0 的已录入数值计入平均值，避免缺失值被误判为优势或劣势。
  const avgPrice = averagePositive(properties.map(p => p.price))
  const avgArea = averagePositive(properties.map(p => p.area))
  const avgPricePerSqm = averagePositive(properties.map(p => p.pricePerSqm))
  const avgAge = averagePositive(properties.map(p => p.age))

  // 比较指标
  const getCompareIndicator = (value: number, avg: number, isHigherBetter: boolean) => {
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(avg) || avg <= 0) return null
    const diff = value - avg
    if (Math.abs(diff) < avg * 0.05) return null // 差异小于5%不显示
    
    if (isHigherBetter) {
      return diff > 0 ? (
        <ArrowUp className="ml-1 inline h-3 w-3 text-success" />
      ) : (
        <ArrowDown className="ml-1 inline h-3 w-3 text-destructive" />
      )
    } else {
      return diff < 0 ? (
        <ArrowUp className="ml-1 inline h-3 w-3 text-success" />
      ) : (
        <ArrowDown className="ml-1 inline h-3 w-3 text-destructive" />
      )
    }
  }

  const differenceSummary = useMemo(() => {
    const summarize = (
      label: string,
      selector: (property: Property) => number,
      direction: 'min' | 'max',
      format: (value: number) => string,
    ): DifferenceSummaryItem | null => {
      const candidates = properties
        .map(property => ({ property, value: selector(property) }))
        .filter(candidate => Number.isFinite(candidate.value) && candidate.value > 0)

      if (candidates.length < 2 || new Set(candidates.map(candidate => candidate.value)).size < 2) {
        return null
      }

      const winner = candidates.reduce((best, candidate) => {
        if (direction === 'min') return candidate.value < best.value ? candidate : best
        return candidate.value > best.value ? candidate : best
      })

      return {
        label,
        property: winner.property,
        value: format(winner.value),
      }
    }

    return [
      summarize(
        propertyMode === 'rent' ? '月租更低' : '总价更低',
        property => property.price,
        'min',
        value => propertyMode === 'rent' ? `${value} 元/月` : `${value} 万`,
      ),
      summarize('面积更大', property => property.area, 'max', value => `${value} ㎡`),
      summarize(
        '单价更低',
        property => property.pricePerSqm,
        'min',
        value => propertyMode === 'rent' ? `${value} 元/㎡/月` : `${value} 万/㎡`,
      ),
      summarize('房龄更短', property => property.age, 'min', value => `${value} 年`),
    ].filter((item): item is DifferenceSummaryItem => item !== null)
  }, [properties, propertyMode])

  const visibleColumns = compareColumns.filter(col => col.visible)

  const handleToggleColumn = (key: string) => {
    setCompareColumns(prev =>
      prev.map(col =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    )
  }

  const handleAddColumn = () => {
    if (!newColumnKey.trim() || !newColumnLabel.trim()) return
    const newColumn: CompareColumnConfig = {
      key: newColumnKey.trim(),
      label: newColumnLabel.trim(),
      unit: newColumnUnit.trim() || undefined,
      visible: true,
      isCustom: true,
    }
    setCompareColumns(prev => [...prev, newColumn])
    setNewColumnKey('')
    setNewColumnLabel('')
    setNewColumnUnit('')
    setShowAddColumnDialog(false)
  }

  const handleRemoveColumn = (key: string) => {
    setCompareColumns(prev => prev.filter(col => col.key !== key))
  }

  const getCellValue = (property: Property, column: CompareColumnConfig) => {
    if (column.isCustom && property.customFields) {
      return property.customFields[column.key]
    }
    return property[column.key as keyof Property]
  }

  const getAvgForColumn = (key: string) => {
    switch (key) {
      case 'price': return avgPrice
      case 'area': return avgArea
      case 'pricePerSqm': return avgPricePerSqm
      case 'age': return avgAge
      default: return null
    }
  }

  // 统计自定义列数量
  const customColumnCount = compareColumns.filter(col => col.isCustom).length

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      {/* 关闭按钮 */}
      <div className="mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-card/80 backdrop-blur-sm shadow-sm"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          房源对比 ({properties.length}套)
        </h2>
        
        {/* 对比列设置 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              对比项设置
              {customColumnCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {customColumnCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">对比项目</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() => setShowAddColumnDialog(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加对比项
                </Button>
              </div>
              
              {/* 内置对比项 */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-2">内置项目</p>
                {compareColumns.filter(col => !col.isCustom).map((column) => (
                  <div
                    key={column.key}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{column.label}</span>
                      {column.unit && (
                        <span className="text-xs text-muted-foreground">({column.unit})</span>
                      )}
                    </div>
                    <Switch
                      checked={column.visible}
                      onCheckedChange={() => handleToggleColumn(column.key)}
                    />
                  </div>
                ))}
              </div>
              
              {/* 自定义对比项 */}
              {compareColumns.filter(col => col.isCustom).length > 0 && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">自定义项目</p>
                  {compareColumns.filter(col => col.isCustom).map((column) => (
                    <div
                      key={column.key}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{column.label}</span>
                        {column.unit && (
                          <span className="text-xs text-muted-foreground">({column.unit})</span>
                        )}
                        <Badge variant="outline" className="text-xs h-5 bg-primary/10 text-primary border-primary/20">
                          自定义
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={column.visible}
                          onCheckedChange={() => handleToggleColumn(column.key)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveColumn(column.key)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  显示 {visibleColumns.length} / {compareColumns.length} 项
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 对比表格 */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[400px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="bg-accent/50 p-2 md:p-4 text-left text-sm font-medium text-muted-foreground">
                对比项
              </th>
              {properties.map((p) => (
                <th
                  key={p.id}
                  className="bg-accent/50 p-2 md:p-4 text-center"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => onViewDetail(p.id)}
                  >
                    <div className="relative mx-auto mb-2 h-16 w-24 md:h-20 md:w-32 overflow-hidden rounded-lg shadow-sm bg-accent">
                      {p.coverImage ? (
                        <Image
                          src={p.coverImage}
                          alt={p.name}
                          fill
                          className="object-cover"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      {p.isFavorite && (
                        <div className="absolute top-1 right-1 bg-primary/90 rounded-full p-1">
                          <svg className="h-3 w-3 text-primary-foreground fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="font-medium text-foreground hover:text-primary transition-colors">
                      {p.name}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleColumns.map((column, idx) => (
              <tr 
                key={column.key} 
                className={`hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-accent/20'}`}
              >
                <td className="p-2 md:p-4 text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.isCustom && (
                      <Badge variant="outline" className="text-xs h-4 px-1 bg-primary/10 text-primary border-primary/20">
                        自定义
                      </Badge>
                    )}
                  </div>
                </td>
                {properties.map((p) => {
                  const value = getCellValue(p, column)
                  const numValue = typeof value === 'number' ? value : null
                  const avg = getAvgForColumn(column.key)
                  
                  return (
                    <td
                      key={p.id}
                      className="p-2 md:p-4 text-center"
                    >
                      <span className={column.key === 'price' ? 'font-bold text-primary' : 'text-foreground'}>
                        {value !== undefined && value !== null && value !== '' ? `${value}${column.unit || ''}` : '-'}
                      </span>
                      {numValue !== null && avg !== null && column.isHigherBetter !== undefined && (
                        getCompareIndicator(numValue, avg, column.isHigherBetter)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* 标签行 */}
            <tr className="hover:bg-accent/30">
              <td className="p-4 text-sm font-medium text-muted-foreground">
                标签
              </td>
              {properties.map((p) => (
                <td key={p.id} className="p-2 md:p-4">
                  <div className="flex flex-wrap justify-center gap-1">
                    {p.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`text-xs ${
                          tag.includes('急售') || tag.includes('议价')
                            ? 'bg-destructive/10 text-destructive'
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
            <tr className="bg-accent/20">
              <td className="p-4 text-sm font-medium text-muted-foreground">状态</td>
              {properties.map((p) => (
                <td key={p.id} className="p-2 md:p-4 text-center">
                  <Badge
                    variant="secondary"
                    className={`${
                      p.status === 'viewed'
                        ? 'bg-success/10 text-success'
                        : p.status === 'pending'
                        ? 'bg-warning/10 text-warning'
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

      {/* 只总结可核对的数值差异，不替用户做主观推荐。 */}
      <section className="border-t border-border pt-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="text-lg font-semibold">差异摘要</h3>
          </div>
          <p className="text-xs text-muted-foreground">只按已录入数值总结，不替你推荐房源</p>
        </div>

        {differenceSummary.length > 0 ? (
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {differenceSummary.map(item => (
              <button
                key={item.label}
                type="button"
                className="min-w-0 bg-card p-4 text-left transition-colors hover:bg-accent"
                onClick={() => onViewDetail(item.property.id)}
              >
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="mt-1 block truncate font-medium text-foreground">{item.property.name}</span>
                <span className="mt-0.5 block text-sm tabular-nums text-primary">{item.value}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
            补全至少两套房的价格、面积、单价或房龄后，这里会自动列出客观差异。
          </div>
        )}
      </section>

      {/* 添加对比项对话框 */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加对比项</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnLabel">显示名称</Label>
              <Input
                id="columnLabel"
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder="例如：到公司距离"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnKey">字段标识</Label>
              <Input
                id="columnKey"
                value={newColumnKey}
                onChange={(e) => setNewColumnKey(e.target.value)}
                placeholder="例如：commute_distance"
              />
              <p className="text-xs text-muted-foreground">用于匹配房源的自定义字段</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnUnit">单位（可选）</Label>
              <Input
                id="columnUnit"
                value={newColumnUnit}
                onChange={(e) => setNewColumnUnit(e.target.value)}
                placeholder="例如：km"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAddColumn} 
              disabled={!newColumnKey.trim() || !newColumnLabel.trim()}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
