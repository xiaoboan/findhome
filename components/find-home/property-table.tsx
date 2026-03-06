'use client'

import { useState } from 'react'
import { Heart, Pencil, Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { Property, ViewMode, SortField, SortOrder, PropertyStatus } from '@/types/property'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

interface PropertyTableProps {
  properties: Property[]
  selectedIds: string[]
  activePropertyId: string | null
  viewMode: ViewMode
  sortField: SortField
  sortOrder: SortOrder
  onSelect: (id: string, isMultiple: boolean) => void
  onViewDetail: (id: string) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  onUpdateProperty: (id: string, updates: Partial<Property>) => void
  onAddProperty: () => void
  onSort: (field: SortField) => void
  stats: { total: number; viewed: number }
}

const statusColors = {
  viewed: 'bg-[#00BFA5]',
  pending: 'bg-[#FFB800]',
  sold: 'bg-[#999999]',
}

const statusLabels = {
  viewed: '已看',
  pending: '待看',
  sold: '已售',
}

export function PropertyTable({
  properties,
  selectedIds,
  activePropertyId,
  viewMode,
  sortField,
  sortOrder,
  onSelect,
  onViewDetail,
  onToggleFavorite,
  onDelete,
  onUpdateProperty,
  onAddProperty,
  onSort,
  stats,
}: PropertyTableProps) {
  const isEditMode = viewMode === 'edit'
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [newTagValue, setNewTagValue] = useState('')

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap hover:bg-muted ${
        sortField === field ? 'text-primary' : ''
      }`}
      onClick={() => onSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </TableHead>
  )

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-16 text-center">对比</TableHead>
              <TableHead className="w-24 whitespace-nowrap">房源名</TableHead>
              <SortableHeader field="name">小区名</SortableHeader>
              <SortableHeader field="price">价格</SortableHeader>
              <TableHead className="whitespace-nowrap">户型</TableHead>
              <SortableHeader field="area">面积</SortableHeader>
              <TableHead className="whitespace-nowrap">核心标签</TableHead>
              <SortableHeader field="lastViewing">最后看房</SortableHeader>
              <TableHead className="whitespace-nowrap">状态</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property, index) => (
              <TableRow
                key={property.id}
                className={`group cursor-pointer border-b border-border transition-colors duration-200 ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                } ${
                  activePropertyId === property.id
                    ? 'border-l-[3px] border-l-primary bg-secondary'
                    : 'hover:bg-secondary/50'
                } ${selectedIds.includes(property.id) ? 'bg-secondary' : ''}`}
                onClick={(e) => {
                  if (!isEditMode && !(e.target as HTMLElement).closest('button, input, [role="checkbox"], select, [data-radix-collection-item]')) {
                    onViewDetail(property.id)
                  }
                }}
              >
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(property.id)}
                    onCheckedChange={() => onSelect(property.id, true)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {property.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {isEditMode ? (
                    <Input
                      value={property.name}
                      onChange={(e) => onUpdateProperty(property.id, { name: e.target.value })}
                      className="h-8 w-full min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-foreground">{property.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={property.price}
                      onChange={(e) => onUpdateProperty(property.id, { price: Number(e.target.value) })}
                      className="h-8 w-20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-bold text-primary">{property.price}万</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditMode ? (
                    <Input
                      value={property.layout}
                      onChange={(e) => onUpdateProperty(property.id, { layout: e.target.value })}
                      className="h-8 w-24"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-muted-foreground">{property.layout}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditMode ? (
                    <Input
                      type="number"
                      value={property.area}
                      onChange={(e) => onUpdateProperty(property.id, { area: Number(e.target.value) })}
                      className="h-8 w-16"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-muted-foreground">{property.area}㎡</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {isEditMode ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {property.tags.map((tag) => (
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
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {property.tags.slice(0, 2).map((tag) => (
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
                      {property.tags.length > 2 && (
                        <Badge variant="secondary" className="bg-muted text-xs text-muted-foreground">
                          +{property.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={property.lastViewing || ''}
                      onChange={(e) => onUpdateProperty(property.id, { lastViewing: e.target.value })}
                      className="h-8 w-32"
                    />
                  ) : (
                    <span className="text-muted-foreground">{property.lastViewing || '-'}</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {isEditMode ? (
                    <Select
                      value={property.status}
                      onValueChange={(value: PropertyStatus) => onUpdateProperty(property.id, { status: value })}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待看</SelectItem>
                        <SelectItem value="viewed">已看</SelectItem>
                        <SelectItem value="sold">已售</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusColors[property.status]}`} />
                      <span className="text-sm text-muted-foreground">{statusLabels[property.status]}</span>
                    </div>
                  )}
                </TableCell>
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
                      onClick={() => onViewDetail(property.id)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => onDelete(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 底部统计和添加按钮 */}
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>共 <strong className="text-foreground">{stats.total}</strong> 套房源</span>
          <span>已看 <strong className="text-[#00BFA5]">{stats.viewed}</strong> 套</span>
        </div>
        {isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddProperty}
            className="gap-1 border-primary text-primary hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            添加房源
          </Button>
        )}
      </div>
    </div>
  )
}
