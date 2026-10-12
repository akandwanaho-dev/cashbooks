import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Network } from '@capacitor/network'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { Provider, RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js'
import {
  clearStoredConfiguration,
  getSupabaseClient,
  loadConfiguration,
  persistConfiguration,
  persistDemoMode,
} from '@/lib/supabaseClient'
import { seedTransactions } from '@/lib/demoData'
import {
  cacheCloudSnapshot,
  cacheTransaction,
  flushOutbox,
  loadCachedTransactions,
  pendingMutationCount,
  queueMutation,
  removeCachedTransaction,
} from '@/lib/offlineStore'
import type { AppConfig, AppUser, Transaction, TransactionInput } from '@/types'

const DEMO_DATA_KEY = 'cashbook.demo.transactions.v2'
type SignUpResult = { needsEmailConfirmation: boolean }

interface AppContextValue {
  config: AppConfig | null
  user: AppUser | null
  transactions: Transaction[]
  authLoading: boolean
  transactionsLoading: boolean
  isDemo: boolean
  isOnline: boolean
  isSyncing: boolean
  pendingChanges: number
  configureSupabase: (url: string, anonKey: string) => void
  enableDemo: () => void
  resetConfiguration: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  addTransaction: (input: TransactionInput) => Promise<void>
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  refreshTransactions: () => Promise<void>
  syncNow: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function normalizeTransaction(row: Record<string, unknown>): Transaction {
  const createdAt = String(row.created_at || new Date().toISOString())
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    date: String(row.date),
    occurred_at: String(row.occurred_at || `${String(row.date)}T12:00:00`),
    description: String(row.description),
    merchant: row.merchant ? String(row.merchant) : null,
    notes: row.notes ? String(row.notes) : null,
    account_id: row.account_id ? String(row.account_id) : null,
    type: row.type as Transaction['type'],
    amount: Number(row.amount),
    currency_code: (row.currency_code || 'UGX') as Transaction['currency_code'],
    exchange_rate_to_ugx: Number(row.exchange_rate_to_ugx || 1),
    category: String(row.category),
    created_at: createdAt,
    updated_at: String(row.updated_at || createdAt),
  }
}

function isNetworkFailure(error: unknown) {
  if (!navigator.onLine) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|network|load failed|offline|timeout/i.test(message)
}

function readDemoTransactions() {
  try {
    const stored = localStorage.getItem(DEMO_DATA_KEY)
    const rows = stored ? (JSON.parse(stored) as Array<Record<string, unknown>>) : seedTransactions
    return rows.map((row) => normalizeTransaction(row as unknown as Record<string, unknown>))
  } catch {
    return seedTransactions.map((row) => normalizeTransaction(row as unknown as Record<string, unknown>))
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(() => loadConfiguration())
  const [, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [authLoading, setAuthLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(0)
  const syncLock = useRef(false)

  const client = useMemo(() => getSupabaseClient(config), [config])
  const isDemo = config?.mode === 'demo'

  useEffect(() => {
    let removeListener: (() => Promise<void>) | undefined
    Network.getStatus().then((status) => setIsOnline(status.connected)).catch(() => undefined)
    Network.addListener('networkStatusChange', (status) => setIsOnline(status.connected))
      .then((handle) => { removeListener = () => handle.remove() })
      .catch(() => undefined)
    return () => { void removeListener?.() }
  }, [])

  // Supabase persists and refreshes the same account session on Android, iOS,
  // desktop and web. Only a small safe user representation reaches the UI.
  useEffect(() => {
    if (!config) {
      setSession(null)
      setUser(null)
      setAuthLoading(false)
      return
    }
    if (config.mode === 'demo') {
      setSession(null)
      setUser({ id: 'demo-user', email: 'demo@cashbook.app' })
      setAuthLoading(false)
      return
    }
    if (!client) return

    let active = true
    setAuthLoading(true)
    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email || 'Account' } : null)
      setAuthLoading(false)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email || 'Account' } : null)
      setAuthLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [client, config])

  // Complete OAuth PKCE when Google/Apple redirects back into the native app.
  useEffect(() => {
    if (!client || !Capacitor.isNativePlatform()) return
    let removeListener: (() => Promise<void>) | undefined
    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith('com.cashbook.app://auth/callback')) return
      const code = new URL(url).searchParams.get('code')
      if (code) await client.auth.exchangeCodeForSession(code)
      await Browser.close().catch(() => undefined)
    }).then((handle) => { removeListener = () => handle.remove() })
    return () => { void removeListener?.() }
  }, [client])

  const refreshPendingCount = useCallback(async () => {
    if (!user || isDemo) return setPendingChanges(0)
    setPendingChanges(await pendingMutationCount(user.id))
  }, [isDemo, user])

  const refreshTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([])
      return
    }
    if (isDemo) {
      setTransactions(readDemoTransactions())
      return
    }

    const cached = await loadCachedTransactions(user.id).catch(() => [])
    if (cached.length) setTransactions(cached)
    if (!client || !isOnline) return

    setTransactionsLoading(true)
    try {
      const { data, error } = await client
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      const cloudRows = (data || []).map((row) => normalizeTransaction(row as Record<string, unknown>))
      const merged = await cacheCloudSnapshot(user.id, cloudRows)
      setTransactions(merged)
    } finally {
      setTransactionsLoading(false)
    }
  }, [client, isDemo, isOnline, user])

  const syncNow = useCallback(async () => {
    if (!client || !user || isDemo || !isOnline || syncLock.current) return
    syncLock.current = true
    setIsSyncing(true)
    try {
      await client.auth.getSession()
      await flushOutbox(client, user.id)
      await refreshPendingCount()
    } finally {
      syncLock.current = false
      setIsSyncing(false)
    }
  }, [client, isDemo, isOnline, refreshPendingCount, user])

  // Load cache immediately, flush the outbox when possible, then reconcile cloud.
  useEffect(() => {
    if (!user) {
      setTransactions([])
      return
    }
    void (async () => {
      try {
        await refreshTransactions()
        await refreshPendingCount()
        if (isOnline && !isDemo) {
          await syncNow()
          await refreshTransactions()
        }
      } catch {
        // Cached rows remain available when sync cannot complete.
      }
    })()
  }, [isDemo, isOnline, refreshPendingCount, refreshTransactions, syncNow, user])

  // Supabase Realtime updates the in-memory UI and the offline cache together.
  useEffect(() => {
    if (!client || !user || isDemo || !isOnline) return
    const applyRealtime = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = String(payload.old.id)
        setTransactions((current) => current.filter((row) => row.id !== deletedId))
        void removeCachedTransaction(deletedId)
        return
      }
      const changed = normalizeTransaction(payload.new)
      setTransactions((current) => [changed, ...current.filter((row) => row.id !== changed.id)])
      void cacheTransaction(changed)
    }
    const channel = client
      .channel(`transactions:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, applyRealtime)
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [client, isDemo, isOnline, user])

  const persistDemoTransactions = (next: Transaction[]) => {
    setTransactions(next)
    try { localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(next)) } catch { /* UI still works for this session. */ }
  }

  const queueOffline = async (operation: 'create' | 'update' | 'delete', transaction: Transaction | null, entityId: string) => {
    if (!user) return
    await queueMutation({
      user_id: user.id,
      entity_id: entityId,
      operation,
      payload: transaction,
      created_at: new Date().toISOString(),
    })
    await refreshPendingCount()
  }

  const configureSupabase = useCallback((url: string, anonKey: string) => {
    setTransactions([])
    setConfig(persistConfiguration(url, anonKey))
  }, [])
  const enableDemo = useCallback(() => {
    setTransactions([])
    setConfig(persistDemoMode())
  }, [])
  const resetConfiguration = useCallback(async () => {
    if (client) await client.auth.signOut().catch(() => undefined)
    clearStoredConfiguration()
    setConfig(null)
    setSession(null)
    setUser(null)
    setTransactions([])
  }, [client])

  const signIn = async (email: string, password: string) => {
    if (!client) throw new Error('Supabase is not configured.')
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
  }
  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (!client) throw new Error('Supabase is not configured.')
    const native = Capacitor.isNativePlatform()
    const redirectTo = native ? 'com.cashbook.app://auth/callback' : `${window.location.origin}/`
    const { data, error } = await client.auth.signInWithOAuth({
      provider: provider as Provider,
      options: { redirectTo, skipBrowserRedirect: native },
    })
    if (error) throw error
    if (native && data.url) await Browser.open({ url: data.url, presentationStyle: 'popover' })
  }

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    if (!client) throw new Error('Supabase is not configured.')
    const { data, error } = await client.auth.signUp({ email, password })
    if (error) throw error
    return { needsEmailConfirmation: !data.session }
  }
  const signOut = async () => {
    if (isDemo) return resetConfiguration()
    if (client) {
      const { error } = await client.auth.signOut()
      if (error) throw error
    }
  }

  const addTransaction = async (input: TransactionInput) => {
    if (!user) throw new Error('You must be signed in.')
    const now = new Date().toISOString()
    const local: Transaction = { ...input, id: crypto.randomUUID(), user_id: user.id, created_at: now, updated_at: now }
    if (isDemo) return persistDemoTransactions([local, ...transactions])

    setTransactions((current) => [local, ...current])
    await cacheTransaction(local)
    if (!client || !isOnline) return queueOffline('create', local, local.id)

    const { data, error } = await client.from('transactions').insert(local).select().single()
    if (error) {
      if (isNetworkFailure(error)) return queueOffline('create', local, local.id)
      setTransactions((current) => current.filter((row) => row.id !== local.id))
      await removeCachedTransaction(local.id)
      throw error
    }
    const saved = normalizeTransaction(data as Record<string, unknown>)
    setTransactions((current) => [saved, ...current.filter((row) => row.id !== saved.id)])
    await cacheTransaction(saved)
  }

  const updateTransaction = async (id: string, input: TransactionInput) => {
    if (!user) throw new Error('You must be signed in.')
    const previous = transactions.find((row) => row.id === id)
    if (!previous) throw new Error('Transaction not found.')
    const local: Transaction = { ...previous, ...input, updated_at: new Date().toISOString() }
    if (isDemo) return persistDemoTransactions(transactions.map((row) => row.id === id ? local : row))

    setTransactions((current) => current.map((row) => row.id === id ? local : row))
    await cacheTransaction(local)
    if (!client || !isOnline) return queueOffline('update', local, id)

    const changes: Partial<Transaction> = { ...local }
    delete changes.id
    delete changes.user_id
    delete changes.created_at
    const { data, error } = await client.from('transactions').update(changes).eq('id', id).select().single()
    if (error) {
      if (isNetworkFailure(error)) return queueOffline('update', local, id)
      setTransactions((current) => current.map((row) => row.id === id ? previous : row))
      await cacheTransaction(previous)
      throw error
    }
    const saved = normalizeTransaction(data as Record<string, unknown>)
    setTransactions((current) => current.map((row) => row.id === id ? saved : row))
    await cacheTransaction(saved)
  }

  const deleteTransaction = async (id: string) => {
    if (!user) throw new Error('You must be signed in.')
    const previous = transactions.find((row) => row.id === id)
    if (!previous) return
    if (isDemo) return persistDemoTransactions(transactions.filter((row) => row.id !== id))

    setTransactions((current) => current.filter((row) => row.id !== id))
    await removeCachedTransaction(id)
    if (!client || !isOnline) return queueOffline('delete', null, id)

    const { error } = await client.from('transactions').delete().eq('id', id)
    if (error) {
      if (isNetworkFailure(error)) return queueOffline('delete', null, id)
      setTransactions((current) => [previous, ...current])
      await cacheTransaction(previous)
      throw error
    }
  }

  const value: AppContextValue = {
    config,
    user,
    transactions,
    authLoading,
    transactionsLoading,
    isDemo: Boolean(isDemo),
    isOnline,
    isSyncing,
    pendingChanges,
    configureSupabase,
    enableDemo,
    resetConfiguration,
    signIn,
    signInWithProvider,
    signUp,
    signOut,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
    syncNow,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
