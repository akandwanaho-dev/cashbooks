import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { GLOBAL_CONFIG_EVENT } from '@/components/GlobalConfigSync'
import { getSupabaseClient } from '@/lib/supabaseClient'

function mergeStringSettings<T extends Record<string, string>>(defaults: T, value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults }
  const strings = Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  return { ...defaults, ...strings }
}

/**
 * Loads a public application-setting section while preserving safe local defaults.
 * Writes remain protected by the administrator-only app_settings RLS policy.
 */
export function useAppSetting<T extends Record<string, string>>(settingKey: string, defaults: T): T {
  const { config, isDemo, user, cloudStatus, reportCloudError } = useApp()
  const client = useMemo(() => getSupabaseClient(config), [config])
  const [values, setValues] = useState<T>(() => ({ ...defaults }))

  useEffect(() => {
    let active = true
    let channel: ReturnType<NonNullable<typeof client>['channel']> | null = null

    const sync = async () => {
      if (isDemo) {
        try {
          const saved = JSON.parse(localStorage.getItem(`cashbook.admin.${settingKey}`) || 'null')
          if (active) setValues(mergeStringSettings(defaults, saved))
        } catch {
          if (active) setValues({ ...defaults })
        }
        return true
      }
      if (!client || !user || cloudStatus !== 'ready') {
        if (active) setValues({ ...defaults })
        return false
      }

      const { data, error } = await client.from('app_settings').select('value').eq('setting_key', settingKey).maybeSingle()
      if (error) {
        reportCloudError(error, 'Application content settings could not be loaded.')
        return false
      }
      if (active) setValues(mergeStringSettings(defaults, data?.value))
      return true
    }

    const handleLocalUpdate = () => { void sync() }
    void sync().then((ready) => {
      if (!active || !ready || isDemo || !client) return
      channel = client
        .channel(`app-setting:${settingKey}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: `setting_key=eq.${settingKey}` }, () => void sync())
        .subscribe()
    })
    window.addEventListener(GLOBAL_CONFIG_EVENT, handleLocalUpdate)

    return () => {
      active = false
      window.removeEventListener(GLOBAL_CONFIG_EVENT, handleLocalUpdate)
      if (channel && client) void client.removeChannel(channel)
    }
  }, [client, cloudStatus, defaults, isDemo, reportCloudError, settingKey, user])

  return values
}
