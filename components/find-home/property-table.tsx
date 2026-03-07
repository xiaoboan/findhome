'use client'

import { useState } from 'react'
import { Heart, Pencil, Trash2, ChevronUp, ChevronDown, Plus, X, Settings2, Eye, EyeOff, GripVertical, Filter, Sparkles } from 'lucide-react'
import { Property, ViewMode, SortField, SortOrder, PropertyStatus, ColumnConfig, DEFAULT_COLUMNS } from '@/types/property'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

interface PropertyTableProps {
  properties: Property[]
  allProperties: Property[]
  selectedIds: string[]
  activePropertyId: string | null
  viewMode: ViewMode
  sortField: SortField
  sortOrder: SortOrder
  columns: ColumnConfig[]
  columnFilters: Record<string, string[]>
  onColumnFiltersChange: (filters: Record<string, string[]>) => void
  onColumnsChange: (columns: ColumnConfig[]) => void
  onSelect: (id: string, isMultiple: boolean) => void
  onViewDetail: (id: string) => void
  onEditDetail: (id: string) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onUpdateProperty: (id: string, updates: Partial<Property>) => void
  onAddProperty: () => void
  onSort: (field: SortField) => void
  stats: { total: number; viewed: number }
  onClearDemoData?: () => void
  showClearDemo?: boolean
}

const statusColors = {
  viewed: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  sold: 'bg-muted text-muted-foreground',
}

const statusLabels = {
  viewed: '已看',
  pending: '待看',
  sold: '已售',
}

export function PropertyTable({
  properties,
  allProperties,
  selectedIds,
  activePropertyId,
  viewMode,
  sortField,
  sortOrder,
  columns,
  columnFilters,
  onColumnFiltersChange,
  onColumnsChange,
  onSelect,
  onViewDetail,
  onEditDetail,
  onToggleFavorite,
  onDelete,
  onUpdateProperty,
  onAddProperty,
  onSort,
  stats,
  onClearDemoData,
  showClearDemo,
}: PropertyTableProps) {
  const isEditMode = viewMode === 'edit'
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [newTagValue, setNewTagValue] = useState('')
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date'>('text')

  const visibleColumns = columns.filter(col => col.visible)

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  // 获取某列所有不重复的值（基于未筛选的全量数据）
  const getUniqueValues = (columnKey: string): string[] => {
    const values = new Set<string>()
    allProperties.forEach((p) => {
      const col = columns.find(c => c.key === columnKey)
      if (col?.isCustom) {
        const v = p.customFields?.[columnKey]
        if (v !== undefined && v !== '') values.add(String(v))
      } else if (columnKey === 'tags') {
        p.tags.forEach(t => values.add(t))
      } else if (columnKey === 'status') {
        values.add(statusLabels[p.status])
      } else {
        const v = (p as unknown as Record<string, unknown>)[columnKey]
        if (v !== undefined && v !== '' && v !== 0) values.add(String(v))
      }
    })
    return Array.from(values).sort()
  }

  const activeFilterCount = Object.values(columnFilters).filter(v => v && v.length > 0).length

  const SortableHeader = ({ field, children, sortable = true }: { field: SortField; children: React.ReactNode; sortable?: boolean }) => {
    const filterValues = columnFilters[field] || []
    const hasFilter = filterValues.length > 0

    return (
      <TableHead
        className={`whitespace-nowrap ${sortable ? 'cursor-pointer select-none' : ''} ${
          sortField === field ? 'text-primary' : ''
        } group/header`}
      >
        <div className="flex items-center gap-0.5">
          <span
            className={`${sortable ? 'hover:text-primary' : ''}`}
            onClick={() => sortable && onSort(field)}
          >
            {children}
            {sortable && <SortIcon field={field} />}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded transition-opacity ${
                  hasFilter
                    ? 'opacity-100 text-primary'
                    : 'opacity-0 group-hover/header:opacity-100 text-muted-foreground hover:text-primary'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <Filter className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="p-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">筛选</span>
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs text-muted-foreground px-1"
                      onClick={() => {
                        const next = { ...columnFilters }
                        delete next[field]
                        onColumnFiltersChange(next)
                      }}
                    >
                      清除
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-48">
                <div className="p-1">
                  {getUniqueValues(field).map((val) => (
                    <label
                      key={val}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={filterValues.includes(val)}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...filterValues, val]
                            : filterValues.filter(v => v !== val)
                          onColumnFiltersChange({
                            ...columnFilters,
                            [field]: next,
                          })
                        }}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate">{val}</span>
                    </label>
                  ))}
                  {getUniqueValues(field).length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">暂无数据</div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </TableHead>
    )
  }

  const handleAddTag = (propertyId: string) => {
    if (!newTagValue.trim()) return
    const property = properties.find(p => p.id === propertyId)
    if (property) {
      onUpdateProperty(propertyId, { tags: [...property.tags, newTagValue.trim()] })
    }
    setNewTagValue('')
    setEditingTagId(null)
  }

  const handleRemoveTag = (propertyId: string, tagToRemove: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (property) {
      onUpdateProperty(propertyId, { tags: property.tags.filter(t => t !== tagToRemove) })
    }
  }

  const handleToggleColumn = (columnId: string) => {
    onColumnsChange(
      columns.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    )
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return
    const newColumn: ColumnConfig = {
      id: `custom_${Date.now()}`,
      key: `custom_${Date.now()}`,
      label: newColumnName.trim(),
      visible: true,
      sortable: true,
      isCustom: true,
      type: newColumnType,
    }
    onColumnsChange([...columns, newColumn])
    setNewColumnName('')
    setNewColumnType('text')
    setShowAddColumnDialog(false)
  }

  const handleDeleteColumn = (columnId: string) => {
    onColumnsChange(columns.filter(col => col.id !== columnId))
  }

  const getCellValue = (property: Property, column: ColumnConfig) => {
    if (column.isCustom) {
      return property.customFields?.[column.key] ?? ''
    }
    return property[column.key as keyof Property]
  }

  const renderCellContent = (property: Property, column: ColumnConfig) => {
    const value = getCellValue(property, column)

    // 自定义列
    if (column.isCustom) {
      if (isEditMode) {
        return (
          <Input
            type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
            value={value as string || ''}
            onChange={(e) => {
              const newValue = column.type === 'number' ? Number(e.target.value) : e.target.value
              onUpdateProperty(property.id, {
                customFields: {
                  ...property.customFields,
                  [column.key]: newValue
                }
              })
            }}
            className="h-8 w-full min-w-[80px]"
            onClick={(e) => e.stopPropagation()}
          />
        )
      }
      return <span className="text-muted-foreground">{value as string || '-'}</span>
    }

    // 内置列的渲染逻辑
    switch (column.key) {
      case 'id':
        return <span className="font-mono text-xs text-muted-foreground">{property.id.slice(0, 8)}</span>
      
      case 'name':
        if (isEditMode) {
          return (
            <Input
              value={property.name}
              onChange={(e) => onUpdateProperty(property.id, { name: e.target.value })}
              className="h-8 w-full min-w-[120px]"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="font-medium text-foreground">{property.name}</span>
      
      case 'price':
        if (isEditMode) {
          return (
            <Input
              type="number"
              value={property.price}
              onChange={(e) => onUpdateProperty(property.id, { price: Number(e.target.value) })}
              className="h-8 w-20"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="font-bold text-primary">{property.price}万</span>
      
      case 'layout':
        if (isEditMode) {
          return (
            <Input
              value={property.layout}
              onChange={(e) => onUpdateProperty(property.id, { layout: e.target.value })}
              className="h-8 w-24"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.layout}</span>
      
      case 'area':
        if (isEditMode) {
          return (
            <Input
              type="number"
              value={property.area}
              onChange={(e) => onUpdateProperty(property.id, { area: Number(e.target.value) })}
              className="h-8 w-16"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.area}㎡</span>
      
      case 'district':
        if (isEditMode) {
          return (
            <Input
              value={property.district}
              onChange={(e) => onUpdateProperty(property.id, { district: e.target.value })}
              className="h-8 w-20"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.district}</span>

      case 'floor':
        if (isEditMode) {
          return (
            <Input
              value={property.floor}
              onChange={(e) => onUpdateProperty(property.id, { floor: e.target.value })}
              className="h-8 w-20"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.floor}</span>

      case 'orientation':
        if (isEditMode) {
          return (
            <Input
              value={property.orientation}
              onChange={(e) => onUpdateProperty(property.id, { orientation: e.target.value })}
              className="h-8 w-20"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.orientation}</span>

      case 'decoration':
        if (isEditMode) {
          return (
            <Input
              value={property.decoration}
              onChange={(e) => onUpdateProperty(property.id, { decoration: e.target.value })}
              className="h-8 w-20"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.decoration}</span>

      case 'age':
        if (isEditMode) {
          return (
            <Input
              type="number"
              value={property.age}
              onChange={(e) => onUpdateProperty(property.id, { age: Number(e.target.value) })}
              className="h-8 w-16"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.age ? `${property.age}年` : '-'}</span>
      
      case 'tags':
        return (
          <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isEditMode ? (
              <>
                {property.tags.map((tag) => (
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
                    <button
                      className="ml-1 hover:text-primary"
                      onClick={() => handleRemoveTag(property.id, tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {editingTagId === property.id ? (
                  <Input
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag(property.id)
                      if (e.key === 'Escape') {
                        setEditingTagId(null)
                        setNewTagValue('')
                      }
                    }}
                    onBlur={() => {
                      if (newTagValue.trim()) handleAddTag(property.id)
                      else {
                        setEditingTagId(null)
                        setNewTagValue('')
                      }
                    }}
                    className="h-6 w-16 text-xs"
                    placeholder="标签名"
                    autoFocus
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setEditingTagId(property.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </>
            ) : (
              <>
                {property.tags.slice(0, 2).map((tag) => (
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
                {property.tags.length > 2 && (
                  <Badge variant="secondary" className="bg-muted text-xs text-muted-foreground">
                    +{property.tags.length - 2}
                  </Badge>
                )}
              </>
            )}
          </div>
        )
      
      case 'lastViewing':
        if (isEditMode) {
          return (
            <Input
              type="date"
              value={property.lastViewing || ''}
              onChange={(e) => onUpdateProperty(property.id, { lastViewing: e.target.value })}
              className="h-8 w-32"
              onClick={(e) => e.stopPropagation()}
            />
          )
        }
        return <span className="text-muted-foreground">{property.lastViewing || '-'}</span>
      
      case 'status':
        if (isEditMode) {
          return (
            <Select
              value={property.status}
              onValueChange={(value: PropertyStatus) => onUpdateProperty(property.id, { status: value })}
            >
              <SelectTrigger className="h-8 w-20" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待看</SelectItem>
                <SelectItem value="viewed">已看</SelectItem>
                <SelectItem value="sold">已售</SelectItem>
              </SelectContent>
            </Select>
          )
        }
        return (
          <Badge variant="secondary" className={`text-xs ${statusColors[property.status]}`}>
            {statusLabels[property.status]}
          </Badge>
        )
      
      default:
        return <span className="text-muted-foreground">{String(value || '-')}</span>
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 列设置工具栏 */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-border">
                <Settings2 className="h-4 w-4" />
                列设置
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">显示列</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => setShowAddColumnDialog(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    添加列
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{column.label}</span>
                        {column.isCustom && (
                          <Badge variant="outline" className="text-xs h-5">自定义</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={column.visible}
                          onCheckedChange={() => handleToggleColumn(column.id)}
                        />
                        {column.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteColumn(column.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">
            显示 {visibleColumns.length} / {columns.length} 列
          </span>
          {showClearDemo && onClearDemoData && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={onClearDemoData}
            >
              <Sparkles className="h-3.5 w-3.5" />
              一键删除示例数据
            </Button>
          )}
          {activeFilterCount > 0 && (
            <span className="flex items-center gap-1 text-sm">
              <Filter className="h-3 w-3 text-primary" />
              <strong className="text-primary">{activeFilterCount}</strong>
              <span className="text-muted-foreground">个筛选</span>
              <button
                className="text-xs text-muted-foreground hover:text-primary underline ml-1"
                onClick={() => onColumnFiltersChange({})}
              >
                全部清除
              </button>
            </span>
          )}
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-12 text-center">对比</TableHead>
              {visibleColumns.map((column) => (
                <SortableHeader 
                  key={column.id} 
                  field={column.key} 
                  sortable={column.sortable}
                >
                  {column.label}
                </SortableHeader>
              ))}
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property, index) => (
              <TableRow
                key={property.id}
                className={`group cursor-pointer border-b border-border transition-colors duration-150 ${
                  index % 2 === 0 ? 'bg-card' : 'bg-accent/30'
                } ${
                  activePropertyId === property.id
                    ? 'border-l-[3px] border-l-primary bg-accent'
                    : 'hover:bg-accent/50'
                } ${selectedIds.includes(property.id) ? 'bg-accent' : ''}`}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button, input, [role="checkbox"], select, [data-radix-collection-item]')) {
                    onViewDetail(property.id)
                  }
                }}
              >
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(property.id)}
                    onCheckedChange={() => onSelect(property.id, true)}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column.id}>
                    {renderCellContent(property, column)}
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onToggleFavorite(property.id)}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          property.isFavorite
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditDetail(property.id)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除「{property.name}」吗？删除后无法恢复。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(property.id)}
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      {/* 底部统计和添加按钮 */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>共 <strong className="text-foreground">{stats.total}</strong> 套房源</span>
          <span>已看 <strong className="text-success">{stats.viewed}</strong> 套</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-primary" />
              <strong className="text-primary">{activeFilterCount}</strong> 个筛选
              <button
                className="text-xs text-muted-foreground hover:text-primary underline"
                onClick={() => onColumnFiltersChange({})}
              >
                全部清除
              </button>
            </span>
          )}
          {selectedIds.length > 0 && (
            <span>已选 <strong className="text-primary">{selectedIds.length}</strong> 套</span>
          )}
        </div>
        {isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddProperty}
            className="gap-1 border-primary text-primary hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            添加房源
          </Button>
        )}
      </div>

      {/* 添加自定义列对话框 */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加自定义列</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">列名称</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="输入列名称..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnType">数据类型</Label>
              <Select value={newColumnType} onValueChange={(v: 'text' | 'number' | 'date') => setNewColumnType(v)}>
                <SelectTrigger id="columnType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文本</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="date">日期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
