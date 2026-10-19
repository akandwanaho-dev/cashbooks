import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseErrorMessage, validateSupabaseSchema } from '@/lib/supabaseErrors'
import type { AppConfig } from '@/types'

const CONFIG_KEY = 'cashbook.database.config.v1'
const DEMO_KEY = 'cashbook.demo.mode.v1'
let cachedClient: SupabaseClient | null = null
let cachedFingerprint = ''

function validUrl(value?: string) {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.hostname.length > 0
  } catch {
    return false
  }
}

/** Prefer build-time configuration; otherwise restore browser configuration. */
export function loadConfiguration(): AppConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

  if (validUrl(envUrl) && envKey) {
    return { mode: 'supabase', url: envUrl!, anonKey: envKey, source: 'environment' }
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { url?: string; anonKey?: string }
      if (validUrl(parsed.url) && parsed.anonKey) {
        return { mode: 'supabase', url: parsed.url!, anonKey: parsed.anonKey, source: 'browser' }
      }
    }
    if (localStorage.getItem(DEMO_KEY) === 'true') {
      return { mode: 'demo', source: 'browser' }
    }
  } catch {
    // Private browsing/storage restrictions are handled by showing setup again.
  }
  return null
}

export function persistConfiguration(url: string, anonKey: string): AppConfig {
  const normalizedUrl = url.trim().replace(/\/$/, '')
  const normalizedKey = anonKey.trim()
  if (!validUrl(normalizedUrl)) throw new Error('Enter a valid HTTPS Supabase project URL.')
  if (normalizedKey.length < 20) throw new Error('The anon or publishable key appears incomplete.')

  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: normalizedUrl, anonKey: normalizedKey }))
  localStorage.removeItem(DEMO_KEY)
  resetSupabaseClient()
  return { mode: 'supabase', url: normalizedUrl, anonKey: normalizedKey, source: 'browser' }
}

export function persistDemoMode(): AppConfig {
  localStorage.setItem(DEMO_KEY, 'true')
  localStorage.removeItem(CONFIG_KEY)
  resetSupabaseClient()
  return { mode: 'demo', source: 'browser' }
}

export function clearStoredConfiguration() {
  localStorage.removeItem(CONFIG_KEY)
  localStorage.removeItem(DEMO_KEY)
  resetSupabaseClient()
}

/** The anon/publishable key is intentionally browser-safe; never use service_role here. */
export function getSupabaseClient(config: AppConfig | null): SupabaseClient | null {
  if (!config || config.mode !== 'supabase') return null
  const fingerprint = `${config.url}:${config.anonKey}`
  if (!cachedClient || cachedFingerprint !== fingerprint) {
    cachedClient = createClient(config.url, config.anonKey, {
      // Cashbook intentionally supports email/password only. URL session parsing
      // stays off so stale OAuth callbacks cannot produce PKCE errors.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
    cachedFingerprint = fingerprint
  }
  return cachedClient
}

export function resetSupabaseClient() {
  cachedClient = null
  cachedFingerprint = ''
}

export async function testSupabaseConnection(url: string, anonKey: string) {
  const normalizedUrl = url.trim().replace(/\/$/, '')
  const normalizedKey = anonKey.trim()
  if (!validUrl(normalizedUrl)) throw new Error('Enter a valid HTTPS Supabase project URL.')
  if (normalizedKey.length < 20) throw new Error('Enter a valid anon or publishable key.')

  try {
    const health = await fetch(`${normalizedUrl}/auth/v1/health`, {
      headers: { apikey: normalizedKey },
      signal: AbortSignal.timeout(10_000),
    })
    if (!health.ok) throw new Error(`Supabase authentication health check returned ${health.status}.`)

    const client = createClient(normalizedUrl, normalizedKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    await validateSupabaseSchema(client)
    return true
  } catch (error) {
    throw new Error(getSupabaseErrorMessage(error, 'Could not connect to Supabase with these settings.'))
  }
}
