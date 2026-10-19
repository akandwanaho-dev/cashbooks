import { useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CurrencyCode } from '@/types'

/** Synchronizes the display preference without coupling the currency engine to Supabase. */
export default function CurrencyAccountSync() {
  const { config, user, isDemo, cloudStatus, reportCloudError } = useApp()
  const { preferredCurrency, setPreferredCurrency } = useCurrency()
  const hydratedUser = useRef<string | null>(null)
  const preferredRef = useRef(preferredCurrency)
  const client = getSupabaseClient(config)

  useEffect(() => { preferredRef.current = preferredCurrency }, [preferredCurrency])

  useEffect(() => {
    if (!client || !user || isDemo || cloudStatus !== 'ready') return
    let active = true
    let channel: ReturnType<typeof client.channel> | null = null
    hydratedUser.current = null

    void (async () => {
      const { data, error } = await client.from('user_preferences').select('preferred_currency').eq('user_id', user.id).maybeSingle()
      if (!active) return
      if (error) {
        reportCloudError(error, 'Your currency preference could not be loaded.')
        return
      }

      hydratedUser.current = user.id
      if (data?.preferred_currency) {
        await setPreferredCurrency(data.preferred_currency as CurrencyCode)
      } else {
        const { error: saveError } = await client.from('user_preferences').upsert(
          { user_id: user.id, preferred_currency: preferredRef.current },
          { onConflict: 'user_id' },
        )
        if (saveError) {
          reportCloudError(saveError, 'Your currency preference could not be initialized.')
          return
        }
      }

      if (!active) return
      channel = client.channel(`preferences:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}` }, (payload) => {
          const code = (payload.new as Record<string, unknown>).preferred_currency
          if (typeof code === 'string' && code !== preferredRef.current) void setPreferredCurrency(code as CurrencyCode)
        })
        .subscribe()
    })()

    return () => {
      active = false
      if (channel) void client.removeChannel(channel)
    }
  }, [client, cloudStatus, isDemo, reportCloudError, setPreferredCurrency, user])

  useEffect(() => {
    if (!client || !user || isDemo || cloudStatus !== 'ready' || hydratedUser.current !== user.id) return
    void client.from('user_preferences').upsert({
      user_id: user.id,
      preferred_currency: preferredCurrency,
    }, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) reportCloudError(error, 'Your currency preference could not be saved.')
    })
  }, [client, cloudStatus, isDemo, preferredCurrency, reportCloudError, user])

  return null
}
