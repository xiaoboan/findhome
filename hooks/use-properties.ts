'use client'

import { useState, useEffect, useCallback } from 'react'
import { Property, ColumnConfig, DEFAULT_COLUMNS } from '@/types/property'
import { getSupabase } from '@/lib/supabase'
import { dbToProperty, propertyToDbUpdate } from '@/lib/db-transforms'
import { deleteImage } from '@/lib/storage'
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
      sb.from('houses').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
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
    } else {
      // 新用户没有列配置，主动写入默认配置
      setColumns(DEFAULT_COLUMNS)
      await sb.from('column_configs').upsert({
        user_id: user.id,
        columns: JSON.parse(JSON.stringify(DEFAULT_COLUMNS)),
      }, { onConflict: 'user_id' })
    }
  }, [user])

  useEffect(() => {
    fetchProperties()
    fetchColumns()
  }, [fetchProperties, fetchColumns])

  // 添加房源
  const addProperty = useCallback(async (initialData?: Partial<Property>) => {
    if (!user) return
    const sb = getSupabase()
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name: '新房源',
    }
    if (initialData) {
      const dbFields = propertyToDbUpdate(initialData)
      Object.assign(insertData, dbFields)
    }
    const { data, error } = await sb
      .from('houses')
      .insert(insertData)
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

    // 先更新本地状态，保证 UI 即时响应
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )

    // viewingRecords 单独处理
    if (updates.viewingRecords) {
      await syncViewingRecords(sb, id, updates.viewingRecords)
    }

    const dbUpdates = propertyToDbUpdate(updates)
    if (Object.keys(dbUpdates).length > 0) {
      await sb.from('houses').update(dbUpdates).eq('id', id)
    }
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

  // 删除房源（同步清理 Storage 中的图片）
  const deleteProperty = useCallback(async (id: string) => {
    if (!user) return
    const prop = properties.find((p) => p.id === id)
    if (prop) {
      // 收集所有需要删除的图片 URL
      const imageUrls: string[] = []
      if (prop.coverImage) imageUrls.push(prop.coverImage)
      for (const record of prop.viewingRecords) {
        imageUrls.push(...record.photos)
      }
      // 并行删除，不阻塞主流程
      Promise.all(imageUrls.map((url) => deleteImage(url).catch(() => {})))
    }
    await getSupabase().from('houses').delete().eq('id', id)
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [user, properties])

  // 切换收藏
  const toggleFavorite = useCallback(async (id: string) => {
    const prop = properties.find((p) => p.id === id)
    if (!prop || !user) return
    const newVal = !prop.isFavorite
    await getSupabase().from('houses').update({ is_favorite: newVal }).eq('id', id)
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

  // 删除示例数据（同步清理图片）
  const clearDemoProperties = useCallback(async () => {
    if (!user) return
    const demoProps = properties.filter((p) => p.isDemo)
    if (demoProps.length === 0) return
    // 收集所有图片 URL
    const imageUrls: string[] = []
    for (const prop of demoProps) {
      if (prop.coverImage) imageUrls.push(prop.coverImage)
      for (const record of prop.viewingRecords) {
        imageUrls.push(...record.photos)
      }
    }
    Promise.all(imageUrls.map((url) => deleteImage(url).catch(() => {})))
    await getSupabase()
      .from('houses')
      .delete()
      .in('id', demoProps.map((p) => p.id))
    setProperties((prev) => prev.filter((p) => !p.isDemo))
  }, [user, properties])

  return {
    properties,
    columns,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    toggleFavorite,
    clearDemoProperties,
    setColumns: saveColumns,
    refetch: fetchProperties,
  }
}
