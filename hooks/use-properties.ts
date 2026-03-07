'use client'

import { useState, useEffect, useCallback } from 'react'
import { Property, ColumnConfig, DEFAULT_COLUMNS } from '@/types/property'
import { getSupabase } from '@/lib/supabase'
import { dbToProperty, propertyToDbUpdate } from '@/lib/db-transforms'
import { useAuth } from '@/components/auth-provider'

export function useProperties() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [loading, setLoading] = useState(true)

  // 加载房源数据
  const fetchProperties = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const sb = getSupabase()

    const [
      { data: propsData },
      { data: recordsData },
      { data: analysesData },
    ] = await Promise.all([
      sb.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      sb.from('viewing_records').select('*'),
      sb.from('ai_analyses').select('*'),
    ])

    if (propsData) {
      const result = (propsData as Record<string, unknown>[]).map((p) => {
        const records = ((recordsData || []) as Record<string, unknown>[]).filter((r) => r.property_id === p.id)
        const analysis = ((analysesData || []) as Record<string, unknown>[]).find((a) => a.property_id === p.id) || null
        return dbToProperty(p, records, analysis)
      })
      setProperties(result)
    }
    setLoading(false)
  }, [user])

  // 加载列配置
  const fetchColumns = useCallback(async () => {
    if (!user) return
    const sb = getSupabase()
    const { data } = await sb
      .from('column_configs')
      .select('columns')
      .eq('user_id', user.id)
      .single()

    if (data?.columns) {
      setColumns(data.columns as ColumnConfig[])
    }
  }, [user])

  useEffect(() => {
    fetchProperties()
    fetchColumns()
  }, [fetchProperties, fetchColumns])

  // 添加房源
  const addProperty = useCallback(async () => {
    if (!user) return
    const sb = getSupabase()
    const { data, error } = await sb
      .from('properties')
      .insert({
        user_id: user.id,
        name: '新房源',
        cover_image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=450&fit=crop',
      })
      .select()
      .single()

    if (!error && data) {
      const newProp = dbToProperty(data, [], null)
      setProperties((prev) => [...prev, newProp])
      return newProp.id
    }
  }, [user])

  // 更新房源
  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    if (!user) return
    const sb = getSupabase()

    // viewingRecords 单独处理
    if (updates.viewingRecords) {
      await syncViewingRecords(sb, id, updates.viewingRecords)
    }

    const dbUpdates = propertyToDbUpdate(updates)
    if (Object.keys(dbUpdates).length > 0) {
      await sb.from('properties').update(dbUpdates).eq('id', id)
    }

    // 立即更新本地状态
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }, [user])

  // 同步看房记录
  const syncViewingRecords = async (
    sb: ReturnType<typeof getSupabase>,
    propertyId: string,
    records: Property['viewingRecords']
  ) => {
    const { data: existing } = await sb
      .from('viewing_records')
      .select('id')
      .eq('property_id', propertyId)

    const existingIds = new Set(((existing || []) as { id: string }[]).map((r) => r.id))
    const newRecordIds = new Set(records.map((r) => r.id))

    // 删除的记录
    const toDelete = Array.from(existingIds).filter((id) => !newRecordIds.has(id))
    if (toDelete.length > 0) {
      await sb.from('viewing_records').delete().in('id', toDelete)
    }

    // 新增或更新
    for (const record of records) {
      if (existingIds.has(record.id)) {
        await sb
          .from('viewing_records')
          .update({
            date: record.date,
            notes: record.notes,
            visit_number: record.visitNumber,
            photos: record.photos,
          })
          .eq('id', record.id)
      } else {
        await sb.from('viewing_records').insert({
          id: record.id,
          property_id: propertyId,
          date: record.date,
          notes: record.notes,
          visit_number: record.visitNumber,
          photos: record.photos,
        })
      }
    }
  }

  // 删除房源
  const deleteProperty = useCallback(async (id: string) => {
    if (!user) return
    await getSupabase().from('properties').delete().eq('id', id)
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [user])

  // 切换收藏
  const toggleFavorite = useCallback(async (id: string) => {
    const prop = properties.find((p) => p.id === id)
    if (!prop || !user) return
    const newVal = !prop.isFavorite
    await getSupabase().from('properties').update({ is_favorite: newVal }).eq('id', id)
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: newVal } : p))
    )
  }, [properties, user])

  // 保存列配置
  const saveColumns = useCallback(async (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    if (!user) return
    await getSupabase()
      .from('column_configs')
      .upsert({
        user_id: user.id,
        columns: JSON.parse(JSON.stringify(newColumns)),
      }, { onConflict: 'user_id' })
  }, [user])

  // 删除所有房源（清除示例数据）
  const clearAllProperties = useCallback(async () => {
    if (!user) return
    await getSupabase().from('properties').delete().eq('user_id', user.id)
    setProperties([])
  }, [user])

  return {
    properties,
    columns,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    toggleFavorite,
    clearAllProperties,
    setColumns: saveColumns,
    refetch: fetchProperties,
  }
}
