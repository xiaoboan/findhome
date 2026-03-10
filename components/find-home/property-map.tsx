'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, MapPin, Loader2, Navigation, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { Property } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { loadAMap, searchLocation } from '@/lib/amap'
import { useIsMobile } from '@/hooks/use-mobile'

interface PropertyMapProps {
  properties: Property[]
  onClose: () => void
  onViewDetail: (id: string) => void
  onUpdateProperty: (id: string, updates: Partial<Property>) => void
}

const statusLabels: Record<string, { text: string; className: string }> = {
  viewed: { text: '已看', className: 'bg-success/10 text-success' },
  pending: { text: '待看', className: 'bg-warning/10 text-warning' },
  sold: { text: '已售', className: 'bg-muted text-muted-foreground' },
}

export function PropertyMap({ properties, onClose, onViewDetail, onUpdateProperty }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 })
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const isMobile = useIsMobile()

  // 对没有坐标的房源进行 POI 搜索
  const geocodeProperties = useCallback(async (props: Property[]) => {
    const needGeocode = props.filter(p => p.longitude == null || p.latitude == null)
    if (needGeocode.length === 0) return

    setGeocoding(true)
    setGeocodeProgress({ done: 0, total: needGeocode.length })
    const newFailed = new Set<string>()

    for (let i = 0; i < needGeocode.length; i++) {
      const p = needGeocode[i]
      const result = await searchLocation(p.name, p.district)
      if (result) {
        onUpdateProperty(p.id, { longitude: result.lng, latitude: result.lat })
      } else {
        newFailed.add(p.id)
      }
      setGeocodeProgress({ done: i + 1, total: needGeocode.length })
    }

    setFailedIds(newFailed)
    setGeocoding(false)
  }, [onUpdateProperty])

  // 初始化地图
  useEffect(() => {
    let destroyed = false

    async function init() {
      if (!mapContainerRef.current) return

      try {
        const AMap = await loadAMap()
        if (destroyed) return

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 12,
          resizeEnable: true,
          viewMode: '2D',
        })

        map.addControl(new AMap.Scale())
        if (!isMobile) {
          map.addControl(new AMap.ToolBar({ position: { bottom: '40px', right: '20px' } }))
        }

        mapRef.current = map
        setLoading(false)

        // 开始地理编码
        await geocodeProperties(properties)
      } catch {
        setLoading(false)
      }
    }

    init()

    return () => {
      destroyed = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 房源数据变化时更新标注
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // 清除旧标注
    markersRef.current.forEach(m => map.remove(m))
    markersRef.current = []

    const locatedProps = properties.filter(p => p.longitude != null && p.latitude != null)
    if (locatedProps.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = (window as any).AMap

    locatedProps.forEach(p => {
      // 自定义标注内容
      const markerContent = document.createElement('div')
      markerContent.className = 'amap-marker-custom'
      markerContent.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        ">
          <div style="
            background: ${p.isFavorite ? '#ef4444' : 'hsl(15, 80%, 55%)'};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            line-height: 1.2;
          ">${p.price}万</div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid ${p.isFavorite ? '#ef4444' : 'hsl(15, 80%, 55%)'};
          "></div>
        </div>
      `

      const marker = new AMap.Marker({
        position: new AMap.LngLat(p.longitude!, p.latitude!),
        content: markerContent,
        offset: new AMap.Pixel(-20, -34),
        extData: p,
      })

      marker.on('click', () => {
        setSelectedProperty(p)
        map.panTo(new AMap.LngLat(p.longitude!, p.latitude!))
      })

      map.add(marker)
      markersRef.current.push(marker)
    })

    // 自动调整视野
    if (locatedProps.length === 1) {
      map.setCenter(new AMap.LngLat(locatedProps[0].longitude!, locatedProps[0].latitude!))
      map.setZoom(15)
    } else {
      map.setFitView(markersRef.current, false, [60, 60, 60, 60])
    }
  }, [properties])

  // 定位到所有标注
  const handleFitView = () => {
    if (mapRef.current && markersRef.current.length > 0) {
      mapRef.current.setFitView(markersRef.current, false, [60, 60, 60, 60])
      setSelectedProperty(null)
    }
  }

  const locatedCount = properties.filter(p => p.longitude != null && p.latitude != null).length

  return (
    <div className="relative h-full w-full">
      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 md:px-4 md:py-3 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            房源地图
          </span>
          <span className="text-xs text-muted-foreground">
            {locatedCount}/{properties.length} 套已定位
            {failedIds.size > 0 && `，${failedIds.size} 套未找到`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 地图容器 */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">加载地图中...</p>
          </div>
        </div>
      )}

      {/* 地理编码进度 */}
      {geocoding && (
        <div className="absolute top-14 left-3 right-3 md:left-4 md:right-auto z-10">
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border shadow-lg px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">
              正在定位房源 {geocodeProgress.done}/{geocodeProgress.total}
            </span>
          </div>
        </div>
      )}

      {/* 全览按钮 */}
      {!loading && locatedCount > 1 && (
        <div className={`absolute z-10 ${isMobile ? 'bottom-4 right-3' : 'bottom-10 left-4'}`}>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 shadow-lg bg-card border border-border"
            onClick={handleFitView}
          >
            <Navigation className="h-3.5 w-3.5" />
            全览
          </Button>
        </div>
      )}

      {/* 底部房源卡片 */}
      {selectedProperty && (
        <div className={`absolute z-10 ${
          isMobile
            ? 'bottom-4 left-3 right-3'
            : 'bottom-10 left-1/2 -translate-x-1/2 w-[360px]'
        }`}>
          <div className="rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
            <div className="flex gap-3 p-3">
              {/* 封面图 */}
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-accent">
                {selectedProperty.coverImage ? (
                  <Image
                    src={selectedProperty.coverImage}
                    alt={selectedProperty.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">{selectedProperty.name}</h3>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${statusLabels[selectedProperty.status]?.className || ''}`}
                  >
                    {statusLabels[selectedProperty.status]?.text || selectedProperty.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-1.5 truncate">
                  {selectedProperty.layout} · {selectedProperty.area}m² · {selectedProperty.floor}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-primary">
                    {selectedProperty.price}<span className="text-xs font-normal text-muted-foreground ml-0.5">万</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5"
                    onClick={() => onViewDetail(selectedProperty.id)}
                  >
                    查看详情
                  </Button>
                </div>
              </div>

              {/* 关闭卡片 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 -mt-1 -mr-1 text-muted-foreground"
                onClick={() => setSelectedProperty(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 标签 */}
            {selectedProperty.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 px-3 pb-3 -mt-0.5">
                {selectedProperty.tags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${
                      tag.includes('急售') || tag.includes('议价')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {tag}
                  </Badge>
                ))}
                {selectedProperty.tags.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{selectedProperty.tags.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
