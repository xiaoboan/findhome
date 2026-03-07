export type PropertyStatus = 'viewed' | 'pending' | 'sold'

export interface ViewingRecord {
  id: string
  date: string
  visitNumber: number
  notes: string
  photos: string[]
}

// 自定义列定义
export interface CustomColumn {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date'
  visible: boolean
  sortable: boolean
}

export interface Property {
  id: string
  name: string
  price: number
  pricePerSqm: number
  layout: string
  area: number
  district: string
  floor: string
  orientation: string
  decoration: string
  age: number
  status: PropertyStatus
  tags: string[]
  lastViewing: string
  isFavorite: boolean
  coverImage: string
  viewingRecords: ViewingRecord[]
  aiAnalysis?: {
    pros: string[]
    cons: string[]
    suitableFor: string[]
    negotiationTips: string[]
  }
  // 自定义字段存储
  customFields?: Record<string, string | number>
}

export type ViewMode = 'list' | 'detail' | 'compare' | 'edit'

export type SortField = 'price' | 'area' | 'lastViewing' | 'name' | string
export type SortOrder = 'asc' | 'desc'

// 默认列配置
export interface ColumnConfig {
  id: string
  key: string
  label: string
  visible: boolean
  sortable: boolean
  isCustom: boolean
  type?: 'text' | 'number' | 'date'
}

// 默认的内置列
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'id', key: 'id', label: '房源ID', visible: false, sortable: false, isCustom: false },
  { id: 'name', key: 'name', label: '小区名', visible: true, sortable: true, isCustom: false },
  { id: 'price', key: 'price', label: '价格', visible: true, sortable: true, isCustom: false },
  { id: 'layout', key: 'layout', label: '户型', visible: true, sortable: false, isCustom: false },
  { id: 'area', key: 'area', label: '面积', visible: true, sortable: true, isCustom: false },
  { id: 'district', key: 'district', label: '区域', visible: false, sortable: true, isCustom: false },
  { id: 'floor', key: 'floor', label: '楼层', visible: false, sortable: false, isCustom: false },
  { id: 'orientation', key: 'orientation', label: '朝向', visible: false, sortable: false, isCustom: false },
  { id: 'decoration', key: 'decoration', label: '装修', visible: false, sortable: false, isCustom: false },
  { id: 'age', key: 'age', label: '房龄', visible: false, sortable: true, isCustom: false },
  { id: 'tags', key: 'tags', label: '核心标签', visible: true, sortable: false, isCustom: false },
  { id: 'lastViewing', key: 'lastViewing', label: '最后看房', visible: true, sortable: true, isCustom: false },
  { id: 'status', key: 'status', label: '状态', visible: true, sortable: false, isCustom: false },
]

// 对比列配置
export interface CompareColumnConfig {
  key: string
  label: string
  visible: boolean
  unit?: string
  isHigherBetter?: boolean
  isCustom?: boolean
}

export const DEFAULT_COMPARE_COLUMNS: CompareColumnConfig[] = [
  { key: 'price', label: '总价', visible: true, unit: '万', isHigherBetter: false },
  { key: 'area', label: '面积', visible: true, unit: '㎡', isHigherBetter: true },
  { key: 'pricePerSqm', label: '单价', visible: true, unit: '万/㎡', isHigherBetter: false },
  { key: 'layout', label: '户型', visible: true },
  { key: 'floor', label: '楼层', visible: true },
  { key: 'orientation', label: '朝向', visible: true },
  { key: 'decoration', label: '装修', visible: true },
  { key: 'age', label: '房龄', visible: true, unit: '年', isHigherBetter: false },
  { key: 'district', label: '区域', visible: false },
]
