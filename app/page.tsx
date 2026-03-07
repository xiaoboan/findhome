'use client'

import { useState, useEffect, useCallback } from 'react'
import { Property, ViewMode, SortField, SortOrder, ColumnConfig, DEFAULT_COLUMNS } from '@/types/property'
import { mockProperties } from '@/lib/mock-data'
import { Header } from '@/components/find-home/header'
import { PropertyTable } from '@/components/find-home/property-table'
import { PropertyDetail } from '@/components/find-home/property-detail'
import { PropertyCompare } from '@/components/find-home/property-compare'
import { FloatingActionButton } from '@/components/find-home/floating-action-button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

export default function FindHomePage() {
  const [properties, setProperties] = useState<Property[]>(mockProperties)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('lastViewing')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  // 筛选和排序后的房源
  const filteredProperties = properties
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.district.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = !filterTag || p.tags.includes(filterTag)

      // 列筛选
      const matchesColumnFilters = Object.entries(columnFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true
        const col = columns.find(c => c.key === key)
        let cellValue: string
        if (col?.isCustom) {
          cellValue = String(p.customFields?.[key] ?? '')
        } else if (key === 'tags') {
          return values.some(v => p.tags.includes(v))
        } else if (key === 'status') {
          const statusLabels: Record<string, string> = { viewed: '已看', pending: '待看', sold: '已售' }
          cellValue = statusLabels[p.status] || p.status
        } else {
          cellValue = String((p as unknown as Record<string, unknown>)[key] ?? '')
        }
        return values.includes(cellValue)
      })

      return matchesSearch && matchesTag && matchesColumnFilters
    })
    .sort((a, b) => {
      let comparison = 0
      
      // 检查是否是自定义列排序
      const customColumn = columns.find(col => col.isCustom && col.key === sortField)
      if (customColumn) {
        const aVal = a.customFields?.[sortField] ?? ''
        const bVal = b.customFields?.[sortField] ?? ''
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal
        } else {
          comparison = String(aVal).localeCompare(String(bVal))
        }
      } else {
        switch (sortField) {
          case 'price':
            comparison = a.price - b.price
            break
          case 'area':
            comparison = a.area - b.area
            break
          case 'lastViewing':
            comparison = new Date(a.lastViewing || '1900-01-01').getTime() - 
                         new Date(b.lastViewing || '1900-01-01').getTime()
            break
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'district':
            comparison = a.district.localeCompare(b.district)
            break
          case 'age':
            comparison = a.age - b.age
            break
          default:
            comparison = 0
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const activeProperty = activePropertyId 
    ? properties.find((p) => p.id === activePropertyId) 
    : null

  const selectedProperties = properties.filter((p) => selectedIds.includes(p.id))

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewMode === 'compare' || viewMode === 'detail') {
          setViewMode('list')
          setActivePropertyId(null)
          setSelectedIds([])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // 选择房源
  const handleSelect = useCallback((id: string, isMultiple: boolean) => {
    setSelectedIds((prev) => {
      let next: string[]
      if (isMultiple) {
        next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      } else {
        next = prev.includes(id) ? prev.filter((i) => i !== id) : [id]
      }
      // 勾选 >= 2 自动进入对比模式，< 2 自动退出
      if (next.length >= 2) {
        setViewMode('compare')
      } else if (viewMode === 'compare') {
        setViewMode('list')
      }
      return next
    })
  }, [viewMode])

  // 点击查看详情
  const handleViewDetail = useCallback((id: string) => {
    setActivePropertyId(id)
    // 如果是编辑模式，保持编辑模式并打开详情
    if (viewMode !== 'edit') {
      setViewMode('detail')
    }
  }, [viewMode])

  // 切换收藏
  const handleToggleFavorite = useCallback((id: string) => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      )
    )
  }, [])

  // 删除房源
  const handleDelete = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id))
    if (activePropertyId === id) {
      setActivePropertyId(null)
      setViewMode('list')
    }
    setSelectedIds((prev) => prev.filter((i) => i !== id))
  }, [activePropertyId])

  // 更新房源
  const handleUpdateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }, [])

  // 添加新房源
  const handleAddProperty = useCallback(() => {
    const newId = Date.now().toString()
    const newProperty: Property = {
      id: newId,
      name: '新房源',
      price: 0,
      pricePerSqm: 0,
      layout: '',
      area: 0,
      district: '',
      floor: '',
      orientation: '',
      decoration: '',
      age: 0,
      status: 'pending',
      tags: [],
      lastViewing: '',
      isFavorite: false,
      coverImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=450&fit=crop',
      viewingRecords: [],
      customFields: {},
    }
    setProperties((prev) => [...prev, newProperty])
    setViewMode('edit')
  }, [])

  // 切换对比模式
  const handleToggleCompare = useCallback(() => {
    if (viewMode === 'compare') {
      setViewMode('list')
      setSelectedIds([])
    } else if (selectedIds.length >= 2) {
      setViewMode('compare')
    }
  }, [viewMode, selectedIds.length])

  // 切换编辑模式
  const handleToggleEdit = useCallback(() => {
    setViewMode((prev) => (prev === 'edit' ? 'list' : 'edit'))
  }, [])

  // 标签筛选
  const handleFilterByTag = useCallback((tag: string) => {
    setFilterTag((prev) => (prev === tag ? null : tag))
  }, [])

  // 排序
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }, [sortField])

  // 统计数据
  const stats = {
    total: properties.length,
    viewed: properties.filter((p) => p.status === 'viewed').length,
  }

  // 编辑模式下选中房源也显示详情
  const showDetail = (viewMode === 'detail' || (viewMode === 'edit' && activePropertyId)) && activeProperty
  const showCompare = viewMode === 'compare' && selectedProperties.length >= 2
  const showSidebar = showDetail || showCompare

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        viewMode={viewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleEdit={handleToggleEdit}
        onToggleCompare={handleToggleCompare}
        canCompare={selectedIds.length >= 2}
        filterTag={filterTag}
        onClearFilter={() => setFilterTag(null)}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* 房源列表 */}
        <ResizablePanel defaultSize={showSidebar ? 55 : 100} minSize={30}>
          <div className="h-full overflow-auto">
            <PropertyTable
              properties={filteredProperties}
              allProperties={properties}
              selectedIds={selectedIds}
              activePropertyId={activePropertyId}
              viewMode={viewMode}
              sortField={sortField}
              sortOrder={sortOrder}
              columns={columns}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              onColumnsChange={setColumns}
              onSelect={handleSelect}
              onViewDetail={handleViewDetail}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              onUpdateProperty={handleUpdateProperty}
              onAddProperty={handleAddProperty}
              onSort={handleSort}
              stats={stats}
            />
          </div>
        </ResizablePanel>

        {/* 详情/对比区域 */}
        {showSidebar && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={25}>
              <div className="h-full overflow-auto bg-background">
                {showCompare ? (
                  <PropertyCompare
                    properties={selectedProperties}
                    customColumns={columns.filter(col => col.isCustom)}
                    onClose={() => {
                      setViewMode('list')
                      setSelectedIds([])
                    }}
                    onViewDetail={handleViewDetail}
                  />
                ) : showDetail ? (
                  <PropertyDetail
                    property={activeProperty}
                    isEditMode={viewMode === 'edit'}
                    customColumns={columns}
                    onClose={() => {
                      // 编辑模式下关闭详情不退出编辑模式
                      if (viewMode !== 'edit') {
                        setViewMode('list')
                      }
                      setActivePropertyId(null)
                    }}
                    onToggleFavorite={() => handleToggleFavorite(activeProperty.id)}
                    onFilterByTag={handleFilterByTag}
                    onUpdateProperty={(updates) => handleUpdateProperty(activeProperty.id, updates)}
                  />
                ) : null}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <FloatingActionButton onAddProperty={handleAddProperty} />
    </div>
  )
}
