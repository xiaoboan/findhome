// 高德地图工具：加载 SDK + POI 搜索 + 地理编码

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || ''
const AMAP_SECRET = process.env.NEXT_PUBLIC_AMAP_SECRET || ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AMapInstance: any = null

export async function loadAMap() {
  if (AMapInstance) return AMapInstance

  // 动态导入避免 SSR 时 window is not defined
  const AMapLoader = (await import('@amap/amap-jsapi-loader')).default

  // 设置安全密钥
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECRET,
  }

  AMapInstance = await AMapLoader.load({
    key: AMAP_KEY,
    version: '2.0',
    plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Scale', 'AMap.ToolBar'],
  })

  return AMapInstance
}

// POI 搜索：通过小区名+区域获取经纬度
export async function searchLocation(
  name: string,
  district: string
): Promise<{ lng: number; lat: number } | null> {
  const AMap = await loadAMap()

  return new Promise((resolve) => {
    const placeSearch = new AMap.PlaceSearch({
      city: district || '全国',
      citylimit: !!district,
      pageSize: 1,
    })

    const keyword = district ? `${name} ${district}` : name

    placeSearch.search(keyword, (
      status: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: any
    ) => {
      if (status === 'complete' && result.poiList?.pois?.length > 0) {
        const poi = result.poiList.pois[0]
        resolve({
          lng: poi.location.getLng(),
          lat: poi.location.getLat(),
        })
      } else {
        // 降级：不带区域再搜一次
        if (district) {
          placeSearch.search(name, (
            s2: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            r2: any
          ) => {
            if (s2 === 'complete' && r2.poiList?.pois?.length > 0) {
              const poi = r2.poiList.pois[0]
              resolve({
                lng: poi.location.getLng(),
                lat: poi.location.getLat(),
              })
            } else {
              resolve(null)
            }
          })
        } else {
          resolve(null)
        }
      }
    })
  })
}
