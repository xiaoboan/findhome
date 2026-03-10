'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, MapPin, Loader2, Navigation, ImageIcon, ChevronDown, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { Property } from '@/types/property'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { loadAMap, searchLocation, detectCity } from '@/lib/amap'
import { useIsMobile } from '@/hooks/use-mobile'

interface PropertyMapProps {
  properties: Property[]
  city: string
  onCityChange: (city: string) => void
  onClose: () => void
  onViewDetail: (id: string) => void
  onUpdateProperty: (id: string, updates: Partial<Property>) => void
}

const statusLabels: Record<string, { text: string; className: string }> = {
  viewed: { text: '已看', className: 'bg-success/10 text-success' },
  pending: { text: '待看', className: 'bg-warning/10 text-warning' },
  sold: { text: '已售', className: 'bg-muted text-muted-foreground' },
}

const HOT_CITIES = [
  '北京', '上海', '广州', '深圳',
  '杭州', '南京', '成都', '武汉',
  '重庆', '苏州', '天津', '西安',
  '长沙', '郑州', '东莞', '佛山',
]

const CITY_STORAGE_KEY = 'findhome_map_city' // 仅用于首次检测缓存，正式数据存数据库

// 对坐标相同的标注做微小偏移，避免完全重叠
function spreadOverlappingCoords(props: Property[]): Map<string, { lng: number; lat: number }> {
  const coordMap = new Map<string, { lng: number; lat: number }>()
  // 按坐标分组
  const groups = new Map<string, Property[]>()
  for (const p of props) {
    if (p.longitude == null || p.latitude == null) continue
    const key = `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  for (const [, group] of groups) {
    if (group.length === 1) {
      const p = group[0]
      coordMap.set(p.id, { lng: p.longitude!, lat: p.latitude! })
    } else {
      // 多个房源在同一坐标，围绕中心点扇形展开
      const centerLng = group[0].longitude!
      const centerLat = group[0].latitude!
      const offset = 0.0003 // 约30米的偏移
      const angleStep = (2 * Math.PI) / group.length

      group.forEach((p, i) => {
        const angle = angleStep * i - Math.PI / 2 // 从正上方开始
        coordMap.set(p.id, {
          lng: centerLng + offset * Math.cos(angle),
          lat: centerLat + offset * Math.sin(angle),
        })
      })
    }
  }

  return coordMap
}

export function PropertyMap({ properties, city, onCityChange, onClose, onViewDetail, onUpdateProperty }: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 })
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  // 同小区多房源列表
  const [overlappingList, setOverlappingList] = useState<Property[] | null>(null)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [cityOpen, setCityOpen] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const geocodingRef = useRef(false)
  const hasFitViewRef = useRef(false)
  const isMobile = useIsMobile()

  // 自动缩放到所有标注（只在 geocode 完成后或已有坐标时调用）
  const fitToMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || markersRef.current.length === 0) return

    if (markersRef.current.length === 1) {
      const marker = markersRef.current[0]
      map.setCenter(marker.getPosition())
      map.setZoom(15)
    } else {
      map.setFitView(markersRef.current, false, [80, 80, 80, 80])
    }
    hasFitViewRef.current = true
  }, [])

  // 对没有坐标的房源进行 POI 搜索（串行 + 限流）
  const geocodeProperties = useCallback(async (props: Property[], searchCity: string) => {
    const needGeocode = props.filter(p => p.longitude == null || p.latitude == null)
    if (needGeocode.length === 0) {
      // 所有房源已有坐标，直接缩放
      setTimeout(fitToMarkers, 200)
      return
    }

    if (geocodingRef.current) return
    geocodingRef.current = true

    setGeocoding(true)
    setGeocodeProgress({ done: 0, total: needGeocode.length })
    const newFailed = new Set<string>()

    for (let i = 0; i < needGeocode.length; i++) {
      if (!geocodingRef.current) break

      const p = needGeocode[i]
      const result = await searchLocation(p.name, searchCity)
      if (result) {
        onUpdateProperty(p.id, { longitude: result.lng, latitude: result.lat })
      } else {
        newFailed.add(p.id)
      }
      setGeocodeProgress({ done: i + 1, total: needGeocode.length })
    }

    setFailedIds(newFailed)
    setGeocoding(false)
    geocodingRef.current = false
  }, [onUpdateProperty, fitToMarkers])

  // 初始化地图 + 自动检测城市
  useEffect(() => {
    let destroyed = false

    async function init() {
      if (!mapContainerRef.current) return

      try {
        const AMap = await loadAMap()
        if (destroyed) return

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 4,       // 初始小比例尺，geocode 后自动缩放
          center: [104.07, 30.67], // 中国中心
          resizeEnable: true,
          viewMode: '2D',
        })

        map.addControl(new AMap.Scale())
        if (!isMobile) {
          map.addControl(new AMap.ToolBar({ position: { bottom: '40px', right: '20px' } }))
        }

        mapRef.current = map
        setLoading(false)
        setMapReady(true)

        // 使用数据库中的城市，没有则自动检测
        let useCity = city
        if (!useCity) {
          // 先看 localStorage 缓存（首次检测结果）
          const cachedCity = localStorage.getItem(CITY_STORAGE_KEY)
          if (cachedCity) {
            useCity = cachedCity
          } else {
            useCity = await detectCity()
            if (useCity) {
              localStorage.setItem(CITY_STORAGE_KEY, useCity)
            }
          }
        }

        if (destroyed) return

        if (useCity && useCity !== city) {
          onCityChange(useCity)
        }

        await geocodeProperties(properties, useCity)
      } catch {
        setLoading(false)
      }
    }

    init()

    return () => {
      destroyed = true
      geocodingRef.current = false
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 房源数据变化时更新标注（需要地图初始化完成后才执行）
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // 清除旧标注
    markersRef.current.forEach(m => map.remove(m))
    markersRef.current = []

    const locatedProps = properties.filter(p => p.longitude != null && p.latitude != null)
    if (locatedProps.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = (window as any).AMap

    // 计算展开后的坐标
    const spreadCoords = spreadOverlappingCoords(locatedProps)

    // 按坐标分组，找出重叠的房源
    const coordGroups = new Map<string, Property[]>()
    for (const p of locatedProps) {
      const key = `${p.longitude!.toFixed(6)},${p.latitude!.toFixed(6)}`
      if (!coordGroups.has(key)) coordGroups.set(key, [])
      coordGroups.get(key)!.push(p)
    }
    const overlappingMap = new Map<string, Property[]>()
    for (const [, group] of coordGroups) {
      if (group.length > 1) {
        for (const p of group) {
          overlappingMap.set(p.id, group)
        }
      }
    }

    locatedProps.forEach(p => {
      const coord = spreadCoords.get(p.id)
      if (!coord) return

      const isOverlapping = overlappingMap.has(p.id)
      const groupSize = overlappingMap.get(p.id)?.length || 1

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
            position: relative;
          ">${p.price}万${isOverlapping ? `<span style="
            position: absolute;
            top: -6px;
            right: -6px;
            background: #3b82f6;
            color: white;
            font-size: 10px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            border: 1.5px solid white;
          ">${groupSize}</span>` : ''}</div>
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
        position: new AMap.LngLat(coord.lng, coord.lat),
        content: markerContent,
        offset: new AMap.Pixel(-20, -34),
        extData: p,
      })

      marker.on('click', () => {
        const group = overlappingMap.get(p.id)
        if (group && group.length > 1) {
          // 同小区多房源，展示列表供选择
          setOverlappingList(group)
          setSelectedProperty(null)
        } else {
          setOverlappingList(null)
          setSelectedProperty(p)
        }
        map.panTo(new AMap.LngLat(coord.lng, coord.lat))
      })

      map.add(marker)
      markersRef.current.push(marker)
    })

    // geocode 完成后自动缩放（只在非 geocoding 时，即所有坐标已就绪）
    if (!geocodingRef.current) {
      // 延迟一帧确保标注渲染完成
      setTimeout(fitToMarkers, 50)
    }
  }, [properties, mapReady, fitToMarkers])

  // geocoding 结束后自动缩放
  useEffect(() => {
    if (!geocoding && !loading && markersRef.current.length > 0 && !hasFitViewRef.current) {
      fitToMarkers()
    }
  }, [geocoding, loading, fitToMarkers])

  // 切换城市后，清除旧坐标重新搜索
  const handleCityChange = useCallback(async (newCity: string) => {
    onCityChange(newCity)
    setCityOpen(false)
    setCitySearch('')
    hasFitViewRef.current = false

    for (const p of properties) {
      if (p.longitude != null || p.latitude != null) {
        onUpdateProperty(p.id, { longitude: undefined, latitude: undefined })
      }
    }

    setTimeout(() => {
      geocodeProperties(
        properties.map(p => ({ ...p, longitude: undefined, latitude: undefined })),
        newCity
      )
    }, 100)
  }, [properties, onUpdateProperty, onCityChange, geocodeProperties])

  // 选择重叠列表中的某个房源
  const handleSelectFromList = (p: Property) => {
    setOverlappingList(null)
    setSelectedProperty(p)
  }

  const handleFitView = () => {
    if (mapRef.current && markersRef.current.length > 0) {
      mapRef.current.setFitView(markersRef.current, false, [80, 80, 80, 80])
      setSelectedProperty(null)
      setOverlappingList(null)
    }
  }

  const locatedCount = properties.filter(p => p.longitude != null && p.latitude != null).length
  const filteredCities = citySearch
    ? HOT_CITIES.filter(c => c.includes(citySearch))
    : HOT_CITIES

  return (
    <div className="relative h-full w-full">
      {/* 顶部栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 md:px-4 md:py-3 bg-card/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-sm shrink-0">房源地图</span>

          {/* 城市选择 */}
          <Popover open={cityOpen} onOpenChange={setCityOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs border-border"
              >
                <MapPin className="h-3 w-3" />
                {city || '选择城市'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <Input
                placeholder="搜索城市..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="h-8 text-sm mb-2"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {filteredCities.map((c) => (
                  <Button
                    key={c}
                    variant={city === c ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-xs px-0 ${city === c ? '' : 'text-foreground'}`}
                    onClick={() => handleCityChange(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              {citySearch && !filteredCities.length && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  未找到，可直接输入后回车
                </p>
              )}
              {citySearch && !filteredCities.includes(citySearch) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => handleCityChange(citySearch)}
                >
                  使用 &quot;{citySearch}&quot;
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground truncate">
            {locatedCount}/{properties.length} 已定位
            {failedIds.size > 0 && `，${failedIds.size} 未找到`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full shrink-0"
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

      {/* 同小区多房源选择列表 */}
      {overlappingList && (
        <div className={`absolute z-10 ${
          isMobile
            ? 'bottom-4 left-3 right-3'
            : 'bottom-10 left-1/2 -translate-x-1/2 w-[360px]'
        }`}>
          <div className="rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span className="text-sm font-medium">
                {overlappingList[0].name}
                <span className="text-muted-foreground font-normal ml-1">({overlappingList.length}套)</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => setOverlappingList(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="px-2 pb-2 max-h-48 overflow-y-auto">
              {overlappingList.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-accent transition-colors text-left"
                  onClick={() => handleSelectFromList(p)}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-accent">
                    {p.coverImage ? (
                      <Image
                        src={p.coverImage}
                        alt={p.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{p.roomNumber || p.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1 py-0 shrink-0 ${statusLabels[p.status]?.className || ''}`}
                      >
                        {statusLabels[p.status]?.text}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.layout} · {p.area}m² · <span className="text-primary font-medium">{p.price}万</span>
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 底部房源卡片（单个房源） */}
      {selectedProperty && !overlappingList && (
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
