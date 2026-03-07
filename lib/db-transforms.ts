import { Property } from '@/types/property'

// DB row -> 前端 Property
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToProperty(row: any, viewingRecords: any[], aiAnalysis: any | null): Property {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    pricePerSqm: Number(row.price_per_sqm),
    layout: row.layout,
    area: Number(row.area),
    district: row.district,
    floor: row.floor,
    orientation: row.orientation,
    decoration: row.decoration,
    age: row.age,
    status: row.status,
    tags: row.tags || [],
    lastViewing: row.last_viewing || '',
    isFavorite: row.is_favorite,
    coverImage: row.cover_image,
    viewingRecords: (viewingRecords || [])
      .sort((a: { visit_number: number }, b: { visit_number: number }) => b.visit_number - a.visit_number)
      .map((r: { id: string; date: string; visit_number: number; notes: string; photos: string[] }) => ({
        id: r.id,
        date: r.date,
        visitNumber: r.visit_number,
        notes: r.notes,
        photos: r.photos || [],
      })),
    aiAnalysis: aiAnalysis
      ? {
          pros: aiAnalysis.pros || [],
          cons: aiAnalysis.cons || [],
          suitableFor: aiAnalysis.suitable_for || [],
          negotiationTips: aiAnalysis.negotiation_tips || [],
        }
      : undefined,
    customFields: row.custom_fields || {},
  }
}

// 前端 Property partial -> DB update 字段 (camelCase -> snake_case)
export function propertyToDbUpdate(updates: Partial<Property>) {
  const result: Record<string, unknown> = {}
  if (updates.name !== undefined) result.name = updates.name
  if (updates.price !== undefined) result.price = updates.price
  if (updates.pricePerSqm !== undefined) result.price_per_sqm = updates.pricePerSqm
  if (updates.layout !== undefined) result.layout = updates.layout
  if (updates.area !== undefined) result.area = updates.area
  if (updates.district !== undefined) result.district = updates.district
  if (updates.floor !== undefined) result.floor = updates.floor
  if (updates.orientation !== undefined) result.orientation = updates.orientation
  if (updates.decoration !== undefined) result.decoration = updates.decoration
  if (updates.age !== undefined) result.age = updates.age
  if (updates.status !== undefined) result.status = updates.status
  if (updates.tags !== undefined) result.tags = updates.tags
  if (updates.lastViewing !== undefined) result.last_viewing = updates.lastViewing || null
  if (updates.isFavorite !== undefined) result.is_favorite = updates.isFavorite
  if (updates.coverImage !== undefined) result.cover_image = updates.coverImage
  if (updates.customFields !== undefined) result.custom_fields = updates.customFields
  return result
}
