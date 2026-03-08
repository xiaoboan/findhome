'use client'

import { useState, useRef } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { ViewMode, SortField, SortOrder, Property } from '@/types/property'
import { useAuth } from '@/components/auth-provider'
import { useProperties } from '@/hooks/use-properties'
import { LoginPage } from '@/components/find-home/login-page'
import { Header } from '@/components/find-home/header'
import { PropertyTable } from '@/components/find-home/property-table'
import { PropertyDetail } from '@/components/find-home/property-detail'
import { PropertyCompare } from '@/components/find-home/property-compare'
import { FloatingActionButton, FloatingActionButtonRef } from '@/components/find-home/floating-action-button'
import { ParsedProperty } from '@/lib/ai'
import { uploadImage } from '@/lib/storage'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

export default function FindHomePage() {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const {
    properties,
    columns,
    loading: dataLoading,
    addProperty,
    updateProperty,
    deleteProperty,
    toggleFavorite,
    setColumns,
    clearDemoProperties,
  } = useProperties()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isCompareSelecting, setIsCompareSelecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('lastViewing')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const fabRef = useRef<FloatingActionButtonRef>(null)

  // 是否存在示例数据
  const hasDemoData = properties.some((p) => p.isDemo)

  // 认证加载中
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录 -> 登录页
  if (!user) {
    return <LoginPage />
  }

  // 筛选和排序后的房源
  const filteredProperties = properties
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
        onToggleEdit={() => setViewMode((prev) => (prev === 'edit' ? 'list' : 'edit'))}
        onToggleCompare={() => {
          if (viewMode === 'compare') {
            setViewMode('list')
            setSelectedIds([])
            setIsCompareSelecting(false)
          } else if (isCompareSelecting) {
            setIsCompareSelecting(false)
            setSelectedIds([])
          } else if (selectedIds.length >= 2) {
            setViewMode('compare')
          } else {
            setIsCompareSelecting(true)
          }
        }}
        canCompare={selectedIds.length >= 2}
        isCompareSelecting={isCompareSelecting}
        filterTag={filterTag}
        onClearFilter={() => setFilterTag(null)}
      />

      {dataLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">加载房源数据...</p>
          </div>
        </div>
      ) : isMobile ? (
        <>
          {/* Mobile: table fills the screen, detail/compare opens as full-screen dialog */}
          <div className="flex-1 overflow-hidden">
            <PropertyTable
              properties={filteredProperties}
              allProperties={properties}
              selectedIds={selectedIds}
              activePropertyId={activePropertyId}
              viewMode={viewMode}
              showCompareColumn={isCompareSelecting || selectedIds.length > 0}
              sortField={sortField}
              sortOrder={sortOrder}
              columns={columns}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              onColumnsChange={setColumns}
              onSelect={(id: string, isMultiple: boolean) => {
                setSelectedIds((prev) => {
                  let next: string[]
                  if (isMultiple) {
                    next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                  } else {
                    next = prev.includes(id) ? prev.filter((i) => i !== id) : [id]
                  }
                  // 移动端不自动弹出对比，让用户手动确认
                  if (!isMobile) {
                    if (next.length >= 2) {
                      setViewMode('compare')
                    } else if (viewMode === 'compare') {
                      setViewMode('list')
                    }
                  }
                  return next
                })
              }}
              onViewDetail={(id: string) => {
                setActivePropertyId(id)
                if (viewMode !== 'edit') {
                  setViewMode('detail')
                }
              }}
              onEditDetail={(id: string) => {
                setActivePropertyId(id)
                setViewMode('edit')
              }}
              onToggleFavorite={toggleFavorite}
              onDelete={(id: string) => {
                deleteProperty(id)
                if (activePropertyId === id) {
                  setActivePropertyId(null)
                  setViewMode('list')
                }
                setSelectedIds((prev) => prev.filter((i) => i !== id))
              }}
              onUpdateProperty={updateProperty}
              onAddProperty={async () => {
                await addProperty()
                setViewMode('edit')
              }}
              onSort={(field: SortField) => {
                if (sortField === field) {
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                } else {
                  setSortField(field)
                  setSortOrder('desc')
                }
              }}
              stats={stats}
              onScreenshot={() => fabRef.current?.triggerScreenshot()}
              showClearDemo={hasDemoData}
              onClearDemoData={async () => {
                await clearDemoProperties()
                setActivePropertyId(null)
                setSelectedIds([])
                setViewMode('list')
              }}
            />
          </div>

          {/* 移动端对比选择浮动条 */}
          {isMobile && selectedIds.length >= 2 && viewMode !== 'compare' && (
            <div className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-between rounded-2xl bg-card border border-border shadow-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <GitCompareArrows className="h-4 w-4 text-primary" />
                <span>已选 <strong className="text-primary">{selectedIds.length}</strong> 套房源</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground"
                  onClick={() => {
                    setSelectedIds([])
                    setIsCompareSelecting(false)
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setViewMode('compare')}
                >
                  开始对比
                </Button>
              </div>
            </div>
          )}
          <Dialog
            open={!!showDetail}
            onOpenChange={(open) => {
              if (!open) {
                if (viewMode !== 'edit') setViewMode('list')
                setActivePropertyId(null)
              }
            }}
          >
            <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-full rounded-none border-none p-0 gap-0" showCloseButton={false}>
              <VisuallyHidden><DialogTitle>房源详情</DialogTitle></VisuallyHidden>
              {showDetail && activeProperty && (
                <div className="h-full overflow-auto">
                  <PropertyDetail
                    property={activeProperty}
                    isEditMode={viewMode === 'edit'}
                    customColumns={columns}
                    onClose={() => {
                      if (viewMode !== 'edit') setViewMode('list')
                      setActivePropertyId(null)
                    }}
                    onToggleFavorite={() => toggleFavorite(activeProperty.id)}
                    onFilterByTag={(tag: string) => setFilterTag((prev) => (prev === tag ? null : tag))}
                    onUpdateProperty={(updates) => updateProperty(activeProperty.id, updates)}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Mobile compare dialog */}
          <Dialog
            open={!!showCompare}
            onOpenChange={(open) => {
              if (!open) {
                setViewMode('list')
                setSelectedIds([])
              }
            }}
          >
            <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-full rounded-none border-none p-0 gap-0" showCloseButton={false}>
              <VisuallyHidden><DialogTitle>房源对比</DialogTitle></VisuallyHidden>
              {showCompare && (
                <div className="h-full overflow-auto">
                  <PropertyCompare
                    properties={selectedProperties}
                    customColumns={columns.filter(col => col.isCustom)}
                    onClose={() => {
                      setViewMode('list')
                      setSelectedIds([])
                    }}
                    onViewDetail={(id: string) => {
                      setActivePropertyId(id)
                      setViewMode('detail')
                    }}
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          <ResizablePanel defaultSize={showSidebar ? 55 : 100} minSize={30}>
            <div className="h-full">
              <PropertyTable
                properties={filteredProperties}
                allProperties={properties}
                selectedIds={selectedIds}
                activePropertyId={activePropertyId}
                viewMode={viewMode}
                showCompareColumn={isCompareSelecting || selectedIds.length > 0}
                sortField={sortField}
                sortOrder={sortOrder}
                columns={columns}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                onColumnsChange={setColumns}
                onSelect={(id: string, isMultiple: boolean) => {
                  setSelectedIds((prev) => {
                    let next: string[]
                    if (isMultiple) {
                      next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    } else {
                      next = prev.includes(id) ? prev.filter((i) => i !== id) : [id]
                    }
                    if (next.length >= 2) {
                      setViewMode('compare')
                    } else if (viewMode === 'compare') {
                      setViewMode('list')
                    }
                    return next
                  })
                }}
                onViewDetail={(id: string) => {
                  setActivePropertyId(id)
                  if (viewMode !== 'edit') {
                    setViewMode('detail')
                  }
                }}
                onEditDetail={(id: string) => {
                  setActivePropertyId(id)
                  setViewMode('edit')
                }}
                onToggleFavorite={toggleFavorite}
                onDelete={(id: string) => {
                  deleteProperty(id)
                  if (activePropertyId === id) {
                    setActivePropertyId(null)
                    setViewMode('list')
                  }
                  setSelectedIds((prev) => prev.filter((i) => i !== id))
                }}
                onUpdateProperty={updateProperty}
                onAddProperty={async () => {
                  await addProperty()
                  setViewMode('edit')
                }}
                onSort={(field: SortField) => {
                  if (sortField === field) {
                    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  } else {
                    setSortField(field)
                    setSortOrder('desc')
                  }
                }}
                stats={stats}
                onScreenshot={() => fabRef.current?.triggerScreenshot()}
                showClearDemo={hasDemoData}
                onClearDemoData={async () => {
                  await clearDemoProperties()
                  setActivePropertyId(null)
                  setSelectedIds([])
                  setViewMode('list')
                }}
              />
            </div>
          </ResizablePanel>

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
                      onViewDetail={(id: string) => {
                        setActivePropertyId(id)
                        setViewMode('detail')
                      }}
                    />
                  ) : showDetail ? (
                    <PropertyDetail
                      property={activeProperty}
                      isEditMode={viewMode === 'edit'}
                      customColumns={columns}
                      onClose={() => {
                        if (viewMode !== 'edit') {
                          setViewMode('list')
                        }
                        setActivePropertyId(null)
                      }}
                      onToggleFavorite={() => toggleFavorite(activeProperty.id)}
                      onFilterByTag={(tag: string) => setFilterTag((prev) => (prev === tag ? null : tag))}
                      onUpdateProperty={(updates) => updateProperty(activeProperty.id, updates)}
                    />
                  ) : null}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}

      <FloatingActionButton
        ref={fabRef}
        columns={columns}
        onAddProperty={async () => {
          await addProperty()
          setViewMode('edit')
        }}
        onAddFromScreenshot={async (data: ParsedProperty, imageFile: File) => {
          const initData: Partial<Property> = {}
          if (data.name) initData.name = data.name
          if (data.roomNumber) initData.roomNumber = data.roomNumber
          if (data.price) initData.price = data.price
          if (data.pricePerSqm) initData.pricePerSqm = data.pricePerSqm
          if (data.layout) initData.layout = data.layout
          if (data.area) initData.area = data.area
          if (data.district) initData.district = data.district
          if (data.floor) initData.floor = data.floor
          if (data.orientation) initData.orientation = data.orientation
          if (data.decoration) initData.decoration = data.decoration
          if (data.age) initData.age = data.age
          if (data.tags?.length) initData.tags = data.tags
          if (data.customFields) initData.customFields = data.customFields
          const newId = await addProperty(initData)
          if (newId && user) {
            uploadImage(imageFile, user.id, newId)
              .then((coverUrl) => updateProperty(newId, { coverImage: coverUrl }))
              .catch((e) => console.error('封面图上传失败:', e))
          }
        }}
      />
    </div>
  )
}
