'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Heart, MapPin, Ruler, Building2, Compass, PaintBucket, Calendar, Sparkles, ChevronLeft, ChevronRight, Plus, Pencil, Check } from 'lucide-react'
import { Property, PropertyStatus } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface PropertyDetailProps {
  property: Property
  isEditMode: boolean
  onClose: () => void
  onToggleFavorite: () => void
  onFilterByTag: (tag: string) => void
  onUpdateProperty: (updates: Partial<Property>) => void
}

export function PropertyDetail({
  property,
  isEditMode,
  onClose,
  onToggleFavorite,
  onFilterByTag,
  onUpdateProperty,
}: PropertyDetailProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

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

  const infoItems = [
    { icon: MapPin, label: '区域', key: 'district', value: property.district },
    { icon: Ruler, label: '面积', key: 'area', value: `${property.area}`, suffix: '㎡' },
    { icon: Building2, label: '楼层', key: 'floor', value: property.floor },
    { icon: Compass, label: '朝向', key: 'orientation', value: property.orientation },
    { icon: PaintBucket, label: '装修', key: 'decoration', value: property.decoration },
    { icon: Calendar, label: '房龄', key: 'age', value: `${property.age}`, suffix: '年' },
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

      {/* 编辑模式指示器 */}
      {isEditMode && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">编辑模式 - 点击字段可直接编辑</span>
        </div>
      )}

      {/* 封面图 */}
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={property.coverImage}
          alt={property.name}
          fill
          className="object-cover"
          crossOrigin="anonymous"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white/90 shadow-md backdrop-blur-sm hover:bg-white"
          onClick={onToggleFavorite}
        >
          <Heart
            className={`h-5 w-5 ${
              property.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        </Button>
      </div>

      {/* 标题区 */}
      <div className="mb-6">
        {isEditMode ? (
          <Input
            value={property.name}
            onChange={(e) => onUpdateProperty({ name: e.target.value })}
            className="mb-2 text-2xl font-bold"
          />
        ) : (
          <h1 className="mb-2 text-2xl font-bold text-foreground">{property.name}</h1>
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
      </div>

      {/* 核心信息卡片 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {infoItems.map((item) => (
              <div key={item.label} className="text-center">
                <item.icon className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">{item.label}</div>
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
                    className="mt-1 h-7 text-center text-sm font-medium"
                  />
                ) : (
                  <div className="font-medium text-primary">
                    {item.value}{item.suffix || ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 标签云 */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">房源标签</h3>
        <div className="flex flex-wrap gap-2">
          {property.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={`cursor-pointer transition-colors ${
                isEditMode ? '' : 'hover:bg-primary hover:text-primary-foreground'
              } ${
                tag.includes('急售') || tag.includes('议价')
                  ? 'bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B] hover:text-white'
                  : 'bg-secondary text-secondary-foreground'
              }`}
              onClick={() => !isEditMode && onFilterByTag(tag)}
            >
              {tag}
              {isEditMode && (
                <button
                  className="ml-1 hover:text-primary"
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
                  className="h-6 w-20 text-xs"
                  placeholder="新标签"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleAddTag}
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 border-dashed text-xs"
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
      {property.viewingRecords.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">看房记录</h3>
          <div className="relative space-y-4 pl-6">
            <div className="absolute bottom-0 left-2 top-0 w-0.5 bg-border" />
            {property.viewingRecords.map((record) => (
              <div key={record.id} className="relative">
                <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{record.date}</span>
                      <Badge variant="secondary" className="bg-secondary text-xs">
                        第{record.visitNumber}次看房
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isEditMode ? (
                      <Textarea
                        value={record.notes}
                        onChange={(e) => {
                          const updatedRecords = property.viewingRecords.map(r =>
                            r.id === record.id ? { ...r, notes: e.target.value } : r
                          )
                          onUpdateProperty({ viewingRecords: updatedRecords })
                        }}
                        className="mb-3 min-h-[60px] text-sm"
                      />
                    ) : (
                      <p className="mb-3 text-sm text-muted-foreground">{record.notes}</p>
                    )}
                    {record.photos.length > 0 && (
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {record.photos.map((photo, index) => (
                          <div
                            key={photo}
                            className="relative aspect-square cursor-pointer overflow-hidden rounded-md"
                            onClick={() => openLightbox(record.photos, index)}
                          >
                            <Image
                              src={photo}
                              alt={`看房照片 ${index + 1}`}
                              fill
                              className="object-cover transition-transform hover:scale-105"
                              crossOrigin="anonymous"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 快捷标签 */}
                    <div className="flex flex-wrap gap-1">
                      {record.tags.layout.map((t) => (
                        <Badge key={t} variant="outline" className="border-primary/30 text-xs text-primary">
                          户型: {t}
                        </Badge>
                      ))}
                      {record.tags.location.map((t) => (
                        <Badge key={t} variant="outline" className="border-[#00BFA5]/30 text-xs text-[#00BFA5]">
                          位置: {t}
                        </Badge>
                      ))}
                      {record.tags.price.map((t) => (
                        <Badge key={t} variant="outline" className="border-[#FFB800]/30 text-xs text-[#FFB800]">
                          价格: {t}
                        </Badge>
                      ))}
                      {record.tags.decoration.map((t) => (
                        <Badge key={t} variant="outline" className="border-[#FF6B6B]/30 text-xs text-[#FF6B6B]">
                          装修: {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI分析卡片 */}
      {property.aiAnalysis && (
        <Card className="border-primary/20 bg-secondary/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 看房建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-[#00BFA5]">优点</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {property.aiAnalysis.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-[#FF6B6B]">缺点</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {property.aiAnalysis.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-primary">适合人群</h4>
              <div className="flex flex-wrap gap-2">
                {property.aiAnalysis.suitableFor.map((item) => (
                  <Badge key={item} variant="secondary" className="bg-secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-[#FFB800]">议价建议</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {property.aiAnalysis.negotiationTips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full border-primary text-primary hover:bg-secondary"
            >
              生成深度报告
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 图片灯箱 */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl border-none bg-black/95 p-0">
          <VisuallyHidden>
            <DialogTitle>查看照片</DialogTitle>
          </VisuallyHidden>
          <div className="relative aspect-video">
            {lightboxPhotos[lightboxIndex] && (
              <Image
                src={lightboxPhotos[lightboxIndex]}
                alt="查看照片"
                fill
                className="object-contain"
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
          </div>
          <div className="p-4 text-center text-white">
            {lightboxIndex + 1} / {lightboxPhotos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
