'use client'

import { track } from '@vercel/analytics'
import { getSupabase } from '@/lib/supabase'

type AnalyticsProperties = Record<string, string | number | boolean | null>

export type AnalyticsEventName =
  | 'activation_completed'
  | 'auth_mode_changed'
  | 'comparison_started'
  | 'landing_cta_clicked'
  | 'landing_demo_interacted'
  | 'landing_demo_opened'
  | 'landing_viewed'
  | 'property_added'
  | 'property_deleted'
  | 'property_milestone_reached'
  | 'property_mode_changed'
  | 'screenshot_batch_started'
  | 'screenshot_confirmed'
  | 'screenshot_parse_failed'
  | 'screenshot_parsed'
  | 'signin_failed'
  | 'signin_started'
  | 'signin_succeeded'
  | 'signup_failed'
  | 'signup_started'
  | 'signup_succeeded'

const ATTRIBUTION_STORAGE_KEY = 'findhome_campaign_attribution'
const ANONYMOUS_ID_STORAGE_KEY = 'findhome_analytics_anonymous_id'
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function getAnonymousId(): string | null {
  if (typeof window === 'undefined' || typeof globalThis.crypto?.randomUUID !== 'function') return null

  try {
    const stored = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY)
    if (stored && UUID_PATTERN.test(stored)) return stored

    const anonymousId = globalThis.crypto.randomUUID()
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId)
    return anonymousId
  } catch {
    return globalThis.crypto.randomUUID()
  }
}

function trackFirstPartyEvent(
  name: AnalyticsEventName,
  attribution: AnalyticsProperties,
  properties?: AnalyticsProperties
) {
  if (typeof window === 'undefined' || typeof globalThis.crypto?.randomUUID !== 'function') return

  const anonymousId = getAnonymousId()
  if (!anonymousId) return

  const stringAttribution = Object.fromEntries(
    ATTRIBUTION_KEYS.map((key) => [key, typeof attribution[key] === 'string' ? attribution[key] : null])
  ) as Record<(typeof ATTRIBUTION_KEYS)[number], string | null>

  try {
    void getSupabase()
      .rpc('track_analytics_event', {
        p_event_id: globalThis.crypto.randomUUID(),
        p_event_name: name,
        p_anonymous_id: anonymousId,
        p_pathname: window.location.pathname.slice(0, 200),
        p_properties: properties ?? {},
        p_utm_source: stringAttribution.utm_source,
        p_utm_medium: stringAttribution.utm_medium,
        p_utm_campaign: stringAttribution.utm_campaign,
        p_utm_content: stringAttribution.utm_content,
      })
      .then(() => undefined, () => undefined)
  } catch {
    // Analytics must never interrupt the user's workflow.
  }
}

export function trackEvent(name: AnalyticsEventName, properties?: AnalyticsProperties) {
  const attribution = getAttributionProperties()

  try {
    track(name, {
      ...attribution,
      ...properties,
    })
  } catch {
    // Analytics must never interrupt the user's workflow.
  }

  trackFirstPartyEvent(name, attribution, properties)
}
