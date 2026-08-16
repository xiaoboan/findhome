'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Property, PropertyMode, ColumnConfig, DEFAULT_COLUMNS } from '@/types/property'
import { getSupabase } from '@/lib/supabase'
import { dbToProperty, propertyToDbUpdate } from '@/lib/db-transforms'
import { deleteImage, resolveStoredImageUrls } from '@/lib/storage'
import { toStorageReference } from '@/lib/storage-reference'
import { useAuth } from '@/components/auth-provider'
import { trackEvent } from '@/lib/analytics'

async function syncViewingRecords(
  sb: ReturnType<typeof getSupabase>,
  propertyId: string,
  records: Property['viewingRecords']
) {
  const { data: existing, error: fetchError } = await sb
    .from('viewing_records')
    .select('id')
    .eq('property_id', propertyId)

  if (fetchError) throw fetchError

  const existingIds = new Set(((existing || []) as { id: string }[]).map((record) => record.id))
  const newRecordIds = new Set(records.map((record) => record.id))
  const toDelete = Array.from(existingIds).filter((id) => !newRecordIds.has(id))

  if (toDelete.length > 0) {
    const { error } = await sb.from('viewing_records').delete().in('id', toDelete)
    if (error) throw error
  }

  for (const record of records) {
    if (existingIds.has(record.id)) {
      const { error } = await sb
        .from('viewing_records')
        .update({
          date: record.date,
          notes: record.notes,
          visit_number: record.visitNumber,
          photos: record.photos.map(toStorageReference),
        })
        .eq('id', record.id)
      if (error) throw error
    } else {
      const { error } = await sb.from('viewing_records').insert({
        id: record.id,
        property_id: propertyId,
        date: record.date,
        notes: record.notes,
        visit_number: record.visitNumber,
        photos: record.photos.map(toStorageReference),
      })
      if (error) throw error
    }
  }
}

export function useProperties() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)
  const [city, setCity] = useState('')
  const [propertyMode, setPropertyMode] = useState<PropertyMode>('buy')
  const [loading, setLoading] = useState(true)
  const updateQueuesRef = useRef(new Map<string, Promise<void>>())

  // 加载房源数据
  const fetchProperties = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
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
        const imageValues = result.flatMap((property) => [
          ...(property.coverImage ? [property.coverImage] : []),
          ...property.viewingRecords.flatMap((record) => record.photos),
        ])
        const resolvedImages = await resolveStoredImageUrls(imageValues)
        setProperties(result.map((property) => ({
          ...property,
          coverImage: resolvedImages.get(property.coverImage) || property.coverImage,
          viewingRecords: property.viewingRecords.map((record) => ({
            ...record,
            photos: record.photos.map((photo) => resolvedImages.get(photo) || photo),
          })),
        })))
      }
    } catch (err) {
      console.error('加载房源数据失败:', err)
    } finally {
      setLoading(false)
    }
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

  // 加载用户偏好（城市、模式）
  const fetchUserPrefs = useCallback(async () => {
    if (!user) return
    const sb = getSupabase()
    const { data } = await sb
      .from('profiles')
      .select('city, property_mode')
      .eq('id', user.id)
      .single()

    if (data?.city) {
      setCity(data.city)
    }
    if (data?.property_mode) {
      setPropertyMode(data.property_mode as PropertyMode)
    }
  }, [user])

  useEffect(() => {
    fetchProperties()
    fetchColumns()
    fetchUserPrefs()
  }, [fetchProperties, fetchColumns, fetchUserPrefs])

  // 添加房源
  const addProperty = useCallback(async (initialData?: Partial<Property>) => {
    if (!user) return
    const sb = getSupabase()
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name: '新房源',
      mode: propertyMode,
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

    if (error || !data) {
      console.error('添加房源失败:', error)
      toast.error('添加失败，请检查网络后重试')
      return
    }

    const newProp = dbToProperty(data, [], null)
    setProperties((prev) => [...prev, newProp])
    trackEvent('property_added', {
      mode: newProp.mode || propertyMode,
      source: initialData ? 'screenshot' : 'manual',
    })
    return newProp.id
  }, [user, propertyMode])

  // 更新房源
  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    if (!user) return Promise.resolve()
    const sb = getSupabase()

    // 先更新本地状态，保证 UI 即时响应
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )

    // 同一房源的写入串行执行，避免快速输入时旧请求覆盖新值。
    const previous = updateQueuesRef.current.get(id) || Promise.resolve()
    const task = previous
      .catch(() => undefined)
      .then(async () => {
        if (updates.viewingRecords) {
          await syncViewingRecords(sb, id, updates.viewingRecords)
        }

        const dbUpdates = propertyToDbUpdate(updates)
        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await sb.from('houses').update(dbUpdates).eq('id', id)
          if (error) throw error
        }
      })
      .catch((error) => {
        console.error('保存房源失败:', error)
        toast.error('保存失败，请检查网络后重试')
      })
      .finally(() => {
        if (updateQueuesRef.current.get(id) === task) {
          updateQueuesRef.current.delete(id)
        }
      })

    updateQueuesRef.current.set(id, task)
    return task
  }, [user])

  // 删除房源（同步清理 Storage 中的图片）
  const deleteProperty = useCallback(async (id: string) => {
    if (!user) return
    const prop = properties.find((p) => p.id === id)
    const { error } = await getSupabase().from('houses').delete().eq('id', id)
    if (error) {
      console.error('删除房源失败:', error)
      toast.error('删除失败，请稍后重试')
      return
    }
    setProperties((prev) => prev.filter((p) => p.id !== id))
    trackEvent('property_deleted', { mode: prop?.mode || propertyMode })

    if (prop) {
      const imageUrls = [
        ...(prop.coverImage ? [prop.coverImage] : []),
        ...prop.viewingRecords.flatMap((record) => record.photos),
      ]
      void Promise.allSettled(imageUrls.map((url) => deleteImage(url)))
    }
  }, [user, properties, propertyMode])

  // 切换收藏
  const toggleFavorite = useCallback(async (id: string) => {
    const prop = properties.find((p) => p.id === id)
    if (!prop || !user) return
    const newVal = !prop.isFavorite
    const { error } = await getSupabase().from('houses').update({ is_favorite: newVal }).eq('id', id)
    if (error) {
      toast.error('收藏状态保存失败')
      return
    }
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

  // 保存用户城市
  const saveCity = useCallback(async (newCity: string) => {
    setCity(newCity)
    if (!user) return
    await getSupabase()
      .from('profiles')
      .update({ city: newCity })
      .eq('id', user.id)
  }, [user])

  // 保存买房/租房模式
  const savePropertyMode = useCallback(async (mode: PropertyMode) => {
    setPropertyMode(mode)
    trackEvent('property_mode_changed', { mode })
    if (!user) return
    await getSupabase()
      .from('profiles')
      .update({ property_mode: mode })
      .eq('id', user.id)
  }, [user])

  return {
    properties,
    columns,
    city,
    propertyMode,
    loading,
    addProperty,
    updateProperty,
    deleteProperty,
    toggleFavorite,
    setColumns: saveColumns,
    setCity: saveCity,
    setPropertyMode: savePropertyMode,
    refetch: fetchProperties,
  }
}
