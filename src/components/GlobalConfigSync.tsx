import { useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { getSupabaseClient } from '@/lib/supabaseClient'

export const GLOBAL_CONFIG_EVENT = 'cashbook-global-config-updated'

function hexToHsl(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return null
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const delta = max - min
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h /= 6
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function applyThemeSettings(value: Record<string, unknown> | null) {
  const color = typeof value?.primary_color === 'string' ? hexToHsl(value.primary_color) : null
  if (color) {
    document.documentElement.style.setProperty('--primary', color)
    document.documentElement.style.setProperty('--ring', color)
  }
}

export default function GlobalConfigSync() {
  const { config, isDemo, user, cloudStatus, reportCloudError } = useApp()
  const client = getSupabaseClient(config)
  useEffect(() => {
    if (!user) return
    if (isDemo) {
      const sync = () => {
        try { applyThemeSettings(JSON.parse(localStorage.getItem('cashbook.admin.themes') || 'null')) } catch { /* Keep default theme. */ }
      }
      sync(); window.addEventListener(GLOBAL_CONFIG_EVENT, sync)
      return () => window.removeEventListener(GLOBAL_CONFIG_EVENT, sync)
    }
    if (!client || cloudStatus !== 'ready') return
    let active = true
    let channel: ReturnType<typeof client.channel> | null = null
    const sync = async () => {
      const { data, error } = await client.from('app_settings').select('value').eq('setting_key', 'themes').maybeSingle()
      if (error) {
        reportCloudError(error, 'Application settings could not be loaded.')
        return false
      }
      if (active) applyThemeSettings(data?.value as Record<string, unknown> | null)
      return true
    }
    void sync().then((ready) => {
      if (!active || !ready) return
      channel = client.channel('global-app-settings').on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => void sync()).subscribe()
    })
    return () => {
      active = false
      if (channel) void client.removeChannel(channel)
    }
  }, [client, cloudStatus, isDemo, reportCloudError, user])
  return null
}
