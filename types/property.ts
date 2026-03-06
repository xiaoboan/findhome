export type PropertyStatus = 'viewed' | 'pending' | 'sold'

export interface ViewingRecord {
  id: string
  date: string
  visitNumber: number
  notes: string
  photos: string[]
  tags: {
    layout: string[]
    location: string[]
    price: string[]
    decoration: string[]
  }
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
}

export type ViewMode = 'list' | 'detail' | 'compare' | 'edit'

export type SortField = 'price' | 'area' | 'lastViewing' | 'name'
export type SortOrder = 'asc' | 'desc'
