'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, Heart, MapPin, Ruler, Building2, Compass, PaintBucket, Calendar, Sparkles, ChevronLeft, ChevronRight, Plus, Pencil, Check, Trash2, Upload, Camera, Loader2, ImageIcon, ExternalLink, Link } from 'lucide-react'
import { Property, PropertyStatus, ColumnConfig } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { uploadImage, deleteImage } from '@/lib/storage'
import { useAuth } from '@/components/auth-provider'

interface PropertyDetailProps {
  property: Property
  isEditMode: boolean
  customColumns: ColumnConfig[]
  onClose: () => void
  onToggleFavorite: () => void
  onFilterByTag: (tag: string) => void
  onUpdateProperty: (updates: Partial<Property>) => void
}

export function PropertyDetail({
  property,
  isEditMode,
  customColumns,
  onClose,
  onToggleFavorite,
  onFilterByTag,
  onUpdateProperty,
}: PropertyDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState<string | null>(null) // recordId being uploaded
  const coverInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const openLightbox = (photos: string[], index: number) => {
    setLightboxPhotos(photos)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const handleAddTag = () => {
    if (newTag.trim()) {
      onUpdateProperty({ tags: [...property.tags, newTag.trim()] })
      setNewTag('')
      setShowAddTag(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateProperty({ tags: property.tags.filter(t => t !== tagToRemove) })
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(file, user.id, property.id)
      onUpdateProperty({ coverImage: url })
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>, recordId: string) => {
    const files = e.target.files
    if (!files || files.length === 0 || !user) return
    setUploadingPhotos(recordId)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadImage(file, user.id, property.id)
        urls.push(url)
      }
      const updatedRecords = property.viewingRecords.map(r =>
        r.id === recordId ? { ...r, photos: [...r.photos, ...urls] } : r
      )
      onUpdateProperty({ viewingRecords: updatedRecords })
    } finally {
      setUploadingPhotos(null)
      e.target.value = ''
    }
  }

  const handleDeletePhoto = async (recordId: string, photoIndex: number) => {
    const record = property.viewingRecords.find(r => r.id === recordId)
    if (!record) return
    const photoUrl = record.photos[photoIndex]
    await deleteImage(photoUrl)
    const updatedPhotos = record.photos.filter((_, i) => i !== photoIndex)
    const updatedRecords = property.viewingRecords.map(r =>
      r.id === recordId ? { ...r, photos: updatedPhotos } : r
    )
    onUpdateProperty({ viewingRecords: updatedRecords })
  }

  const infoItems = [
    { icon: Ruler, label: '面积', key: 'area', value: `${property.area}`, suffix: '㎡' },
    { icon: Building2, label: '楼层', key: 'floor', value: property.floor },
    { icon: Compass, label: '朝向', key: 'orientation', value: property.orientation },
    { icon: PaintBucket, label: '装修', key: 'decoration', value: property.decoration },
    { icon: Calendar, label: '房龄', key: 'age', value: property.age ? `${property.age}` : '', suffix: '年' },
    { icon: MapPin, label: '区域', key: 'district', value: property.district },
  ]

  // 获取自定义字段的显示列表
  const visibleCustomColumns = customColumns.filter(col => col.isCustom && col.visible)

  return (
    <div className="relative h-full overflow-auto p-4 md:p-6">
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

      {/* 编辑模式指示器 */}
      {isEditMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">编辑模式 - 点击字段可直接编辑</span>
        </div>
      )}

      {/* 封面图 */}
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl shadow-lg bg-accent">
        {property.coverImage ? (
          <div
            className="relative h-full w-full cursor-pointer"
            onClick={() => openLightbox([property.coverImage], 0)}
          >
            <Image
              src={property.coverImage}
              alt={property.name}
              fill
              className="object-cover object-top"
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="mb-2 h-12 w-12" />
            <span className="text-sm">{isEditMode ? '点击右上角上传封面图' : '暂无封面图'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        {isEditMode && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 h-9 gap-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
            >
              {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingCover ? '上传中...' : '更换封面'}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 h-11 w-11 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white transition-all hover:scale-105"
          onClick={onToggleFavorite}
        >
          <Heart
            className={`h-5 w-5 ${
              property.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        </Button>
        {/* 状态标签 */}
        <Badge 
          className={`absolute top-4 left-4 ${
            property.status === 'viewed'
              ? 'bg-success text-success-foreground'
              : property.status === 'pending'
              ? 'bg-warning text-warning-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {property.status === 'viewed' ? '已看' : property.status === 'pending' ? '待看' : '已售'}
        </Badge>
      </div>

      {/* 标题区 */}
      <div className="mb-6">
        {isEditMode ? (
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={property.name}
              onChange={(e) => onUpdateProperty({ name: e.target.value })}
              className="text-2xl font-bold h-12 flex-1"
              placeholder="小区名"
            />
            <Input
              value={property.roomNumber}
              onChange={(e) => onUpdateProperty({ roomNumber: e.target.value })}
              className="text-lg h-12 w-32"
              placeholder="房号如39-1201"
            />
          </div>
        ) : (
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {property.name}
            {property.roomNumber && (
              <span className="ml-2 text-lg font-normal text-muted-foreground">({property.roomNumber})</span>
            )}
          </h1>
        )}
        <div className="flex items-baseline gap-2">
          {isEditMode ? (
            <>
              <Input
                type="number"
                value={property.price}
                onChange={(e) => onUpdateProperty({ price: Number(e.target.value) })}
                className="w-32 text-3xl font-bold text-primary"
              />
              <span className="text-3xl font-bold text-primary">万</span>
            </>
          ) : (
            <span className="text-3xl font-bold text-primary">{property.price}万</span>
          )}
          <span className="text-muted-foreground">
            单价 {property.pricePerSqm}万/㎡
          </span>
        </div>

        {/* 状态选择 */}
        {isEditMode && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态:</span>
            <Select
              value={property.status}
              onValueChange={(value: PropertyStatus) => onUpdateProperty({ status: value })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待看</SelectItem>
                <SelectItem value="viewed">已看</SelectItem>
                <SelectItem value="sold">已售</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 房源链接 */}
        {isEditMode ? (
          <div className="mt-3 flex items-center gap-2">
            <Link className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={property.sourceUrl || ''}
              onChange={(e) => onUpdateProperty({ sourceUrl: e.target.value })}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                const urlMatch = text.match(/https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef<>"{}|\\^`[\]]+/)
                if (urlMatch && urlMatch[0] !== text.trim()) {
                  e.preventDefault()
                  onUpdateProperty({ sourceUrl: urlMatch[0] })
                }
              }}
              className="h-8 flex-1"
              placeholder="粘贴安居客、贝壳等平台房源链接或分享文本"
            />
          </div>
        ) : property.sourceUrl ? (
          <div className="mt-3">
            <a
              href={property.sourceUrl.startsWith('http') ? property.sourceUrl : `https://${property.sourceUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              查看平台房源详情
            </a>
          </div>
        ) : null}
      </div>

      {/* 核心信息卡片 */}
      <Card className="mb-6 border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {infoItems.map((item) => (
              <div key={item.label} className="text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                {isEditMode ? (
                  <Input
                    type={item.key === 'area' || item.key === 'age' ? 'number' : 'text'}
                    value={item.value}
                    onChange={(e) => {
                      const val = item.key === 'area' || item.key === 'age'
                        ? Number(e.target.value)
                        : e.target.value
                      onUpdateProperty({ [item.key]: val })
                    }}
                    className="h-8 text-center text-sm font-medium"
                  />
                ) : (
                  <div className="font-semibold text-foreground">
                    {item.value ? `${item.value}${item.suffix || ''}` : '-'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 自定义字段卡片 */}
      {(visibleCustomColumns.length > 0 || isEditMode) && (
        <Card className="mb-6 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">自定义信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customColumns.filter(col => col.isCustom).map((column) => (
              <div key={column.id} className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">{column.label}</Label>
                {isEditMode ? (
                  <Input
                    type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                    value={property.customFields?.[column.key] ?? ''}
                    onChange={(e) => {
                      const val = column.type === 'number' ? Number(e.target.value) : e.target.value
                      onUpdateProperty({
                        customFields: {
                          ...property.customFields,
                          [column.key]: val
                        }
                      })
                    }}
                    className="w-40 h-8 text-right"
                  />
                ) : (
                  <span className="font-medium text-foreground">
                    {property.customFields?.[column.key] || '-'}
                  </span>
                )}
              </div>
            ))}
            {visibleCustomColumns.length === 0 && !isEditMode && (
              <p className="text-sm text-muted-foreground text-center py-2">
                暂无自定义信息，可在表格列设置中添加
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 标签云 */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">房源标签</h3>
        <div className="flex flex-wrap gap-2">
          {property.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={`cursor-pointer transition-all hover:scale-105 ${
                isEditMode ? '' : 'hover:bg-primary hover:text-primary-foreground'
              } ${
                tag.includes('急售') || tag.includes('议价')
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              onClick={() => !isEditMode && onFilterByTag(tag)}
            >
              {tag}
              {isEditMode && (
                <button
                  className="ml-1.5 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveTag(tag)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {isEditMode && (
            showAddTag ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag()
                    if (e.key === 'Escape') {
                      setShowAddTag(false)
                      setNewTag('')
                    }
                  }}
                  className="h-7 w-24 text-sm"
                  placeholder="新标签"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleAddTag}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-dashed text-xs hover:border-primary hover:text-primary"
                onClick={() => setShowAddTag(true)}
              >
                <Plus className="h-3 w-3" />
                添加标签
              </Button>
            )
          )}
        </div>
      </div>

      {/* 看房时间轴 */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">看房记录</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs hover:border-primary hover:text-primary"
            onClick={() => {
              const newRecord = {
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                visitNumber: property.viewingRecords.length + 1,
                notes: '',
                photos: [],
              }
              onUpdateProperty({
                viewingRecords: [newRecord, ...property.viewingRecords],
                lastViewing: newRecord.date,
                status: 'viewed' as PropertyStatus,
              })
              setEditingRecordId(newRecord.id)
            }}
          >
            <Plus className="h-3 w-3" />
            添加记录
          </Button>
        </div>

        {property.viewingRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            暂无看房记录，点击上方按钮添加
          </div>
        ) : (
          <div className="relative space-y-4 pl-6">
            <div className="absolute bottom-0 left-2 top-0 w-0.5 bg-gradient-to-b from-primary to-border" />
            {property.viewingRecords.map((record) => {
              const isEditing = editingRecordId === record.id || isEditMode
              return (
                <div key={record.id} className="relative">
                  <div className="absolute -left-4 top-1 h-3.5 w-3.5 rounded-full border-2 border-primary bg-card shadow-sm" />
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2 bg-accent/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={record.date}
                              onChange={(e) => {
                                const updatedRecords = property.viewingRecords.map(r =>
                                  r.id === record.id ? { ...r, date: e.target.value } : r
                                )
                                onUpdateProperty({ viewingRecords: updatedRecords })
                              }}
                              className="h-7 w-36 text-sm"
                            />
                          ) : (
                            <span className="font-medium text-primary">{record.date}</span>
                          )}
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                            第{record.visitNumber}次看房
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isEditMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingRecordId(isEditing ? null : record.id)}
                            >
                              {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                const updatedRecords = property.viewingRecords.filter(r => r.id !== record.id)
                                onUpdateProperty({ viewingRecords: updatedRecords })
                                if (editingRecordId === record.id) setEditingRecordId(null)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                      {isEditing ? (
                        <Textarea
                          value={record.notes}
                          onChange={(e) => {
                            const updatedRecords = property.viewingRecords.map(r =>
                              r.id === record.id ? { ...r, notes: e.target.value } : r
                            )
                            onUpdateProperty({ viewingRecords: updatedRecords })
                          }}
                          className="mb-3 min-h-[80px] text-sm"
                          placeholder="记录你的看房感受..."
                          autoFocus={editingRecordId === record.id && !record.notes}
                        />
                      ) : (
                        record.notes && (
                          <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{record.notes}</p>
                        )
                      )}
                      {record.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {record.photos.map((photo, index) => (
                            <div
                              key={photo}
                              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg shadow-sm"
                              onClick={() => openLightbox(record.photos, index)}
                            >
                              <Image
                                src={photo}
                                alt={`看房照片 ${index + 1}`}
                                fill
                                className="object-cover transition-transform hover:scale-110"
                                crossOrigin="anonymous"
                              />
                              {isEditing && (
                                <button
                                  className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeletePhoto(record.id, index)
                                  }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {isEditing && (
                        <div className="mt-2">
                          <input
                            ref={photosInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handlePhotosUpload(e, record.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full gap-1.5 border-dashed text-xs hover:border-primary hover:text-primary"
                            onClick={() => photosInputRef.current?.click()}
                            disabled={uploadingPhotos === record.id}
                          >
                            {uploadingPhotos === record.id ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" />上传中...</>
                            ) : (
                              <><Camera className="h-3.5 w-3.5" />添加照片</>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI分析卡片 */}
      {property.aiAnalysis && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/30 to-background shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="rounded-full bg-primary/10 p-1.5">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              AI 看房建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-success flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                优点
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground pl-4">
                {property.aiAnalysis.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-destructive flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                缺点
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground pl-4">
                {property.aiAnalysis.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-primary flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                适合人群
              </h4>
              <div className="flex flex-wrap gap-2">
                {property.aiAnalysis.suitableFor.map((item) => (
                  <Badge key={item} variant="secondary" className="bg-accent">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-warning flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                议价建议
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground pl-4">
                {property.aiAnalysis.negotiationTips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              生成深度报告
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 图片灯箱 */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] border-none bg-black/95 p-0 gap-0" showCloseButton={false}>
          <VisuallyHidden>
            <DialogTitle>查看照片</DialogTitle>
          </VisuallyHidden>
          <div className="relative flex items-center justify-center" style={{ height: '90vh' }}>
            {lightboxPhotos[lightboxIndex] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxPhotos[lightboxIndex]}
                alt="查看照片"
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
              />
            )}
            {lightboxPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 text-white hover:bg-white/40"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === 0 ? lightboxPhotos.length - 1 : prev - 1
                    )
                  }
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 text-white hover:bg-white/40"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === lightboxPhotos.length - 1 ? 0 : prev + 1
                    )
                  }
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/20 text-white hover:bg-white/40 rounded-full"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {lightboxPhotos.length > 1 && (
            <div className="p-4 text-center text-white">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
