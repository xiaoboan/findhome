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
    plugins: ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Scale', 'AMap.ToolBar', 'AMap.CitySearch'],
  })

  return AMapInstance
}

// QPS 限流：确保请求间隔不小于 500ms（2 QPS，留余量给地图瓦片等请求）
let lastRequestTime = 0

async function throttle() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  const minInterval = 500 // 500ms 间隔 = 最多 2 QPS
  if (elapsed < minInterval) {
    await new Promise(resolve => setTimeout(resolve, minInterval - elapsed))
  }
  lastRequestTime = Date.now()
}

// 自动获取用户所在城市
export async function detectCity(): Promise<string> {
  const AMap = await loadAMap()

  return new Promise((resolve) => {
    const citySearch = new AMap.CitySearch()
    citySearch.getLocalCity((
      status: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: any,
    ) => {
      if (status === 'complete' && result.city) {
        resolve(result.city)
      } else {
        resolve('')
      }
    })
  })
}

// POI 搜索：通过小区名 + 城市获取经纬度
export async function searchLocation(
  name: string,
  city: string
): Promise<{ lng: number; lat: number } | null> {
  const AMap = await loadAMap()

  await throttle()

  return new Promise((resolve) => {
    const placeSearch = new AMap.PlaceSearch({
      city: city || '全国',
      citylimit: !!city,
      pageSize: 1,
    })

    placeSearch.search(name, (
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
        resolve(null)
      }
    })
  })
}
