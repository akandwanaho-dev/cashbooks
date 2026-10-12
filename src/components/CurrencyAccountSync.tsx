import { useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { CurrencyCode } from '@/types'

/** Synchronizes the display preference without coupling the currency engine to Supabase. */
export default function CurrencyAccountSync() {
  const { config, user, isDemo } = useApp()
  const { preferredCurrency, setPreferredCurrency } = useCurrency()
  const hydratedUser = useRef<string | null>(null)
  const preferredRef = useRef(preferredCurrency)
  const client = getSupabaseClient(config)

  useEffect(() => { preferredRef.current = preferredCurrency }, [preferredCurrency])

  useEffect(() => {
    if (!client || !user || isDemo) return
    let active = true
    hydratedUser.current = null
    client.from('user_preferences').select('preferred_currency').eq('user_id', user.id).maybeSingle()
      .then(async ({ data, error }) => {
        if (!active || error) return
        hydratedUser.current = user.id
        if (data?.preferred_currency) await setPreferredCurrency(data.preferred_currency as CurrencyCode)
        else await client.from('user_preferences').upsert({ user_id: user.id, preferred_currency: preferredRef.current }, { onConflict: 'user_id' })
      })
    const channel = client.channel(`preferences:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}` }, (payload) => {
        const code = (payload.new as Record<string, unknown>).preferred_currency
        if (typeof code === 'string' && code !== preferredRef.current) void setPreferredCurrency(code as CurrencyCode)
      })
      .subscribe()
    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [client, isDemo, setPreferredCurrency, user])

  useEffect(() => {
    if (!client || !user || isDemo || hydratedUser.current !== user.id) return
    void client.from('user_preferences').upsert({
      user_id: user.id,
      preferred_currency: preferredCurrency,
    }, { onConflict: 'user_id' })
  }, [client, isDemo, preferredCurrency, user])

  return null
}
