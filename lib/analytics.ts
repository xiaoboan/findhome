'use client'

import { track } from '@vercel/analytics'

type AnalyticsProperties = Record<string, string | number | boolean | null>

const ATTRIBUTION_STORAGE_KEY = 'findhome_campaign_attribution'
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const

function getAttributionProperties(): AnalyticsProperties {
  if (typeof window === 'undefined') return {}

  try {
    const params = new URLSearchParams(window.location.search)
    const current = Object.fromEntries(
      ATTRIBUTION_KEYS.flatMap((key) => {
        const value = params.get(key)?.trim().slice(0, 100)
        return value ? [[key, value]] : []
      })
    ) as Record<string, string>

    if (Object.keys(current).length > 0) {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(current))
      return current
    }

    const stored = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as Record<string, unknown>
    return Object.fromEntries(
      ATTRIBUTION_KEYS.flatMap((key) => {
        const value = parsed[key]
        return typeof value === 'string' ? [[key, value.slice(0, 100)]] : []
      })
    )
  } catch {
    return {}
  }
}

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  try {
    track(name, {
      ...getAttributionProperties(),
      ...properties,
    })
  } catch {
    // Analytics must never interrupt the user's workflow.
  }
}
