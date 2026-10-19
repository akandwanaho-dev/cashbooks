import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useApp } from '@/contexts/AppContext'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { MoneyAccount, MoneyQuote, NotificationPreferences, UserProfile } from '@/types'

const DEMO_ACCOUNTS_KEY = 'cashbook.demo.accounts.v1'
const DEMO_PROFILE_KEY = 'cashbook.demo.profile.v1'
const DEMO_QUOTES_KEY = 'cashbook.demo.quotes.v1'
const DEMO_PREFS_KEY = 'cashbook.demo.notification-preferences.v1'

const now = () => new Date().toISOString()

const demoAccounts: MoneyAccount[] = [
  { id: 'account-home', user_id: 'demo-user', name: 'Home', description: 'Household bills and family needs', icon: 'Home', color: '#10b981', budget_amount: 4_000_000, budget_currency: 'UGX', archived: false, sort_order: 1, created_at: now(), updated_at: now() },
  { id: 'account-school', user_id: 'demo-user', name: 'School', description: 'Fees, books and learning materials', icon: 'GraduationCap', color: '#3b82f6', budget_amount: 2_000_000, budget_currency: 'UGX', archived: false, sort_order: 2, created_at: now(), updated_at: now() },
  { id: 'account-business', user_id: 'demo-user', name: 'Business', description: 'Sales and operating costs', icon: 'BriefcaseBusiness', color: '#8b5cf6', budget_amount: 20_000_000, budget_currency: 'UGX', archived: false, sort_order: 3, created_at: now(), updated_at: now() },
  { id: 'account-personal', user_id: 'demo-user', name: 'Personal', description: 'Personal care and lifestyle', icon: 'UserRound', color: '#f59e0b', budget_amount: 1_500_000, budget_currency: 'UGX', archived: false, sort_order: 4, created_at: now(), updated_at: now() },
  { id: 'account-transport', user_id: 'demo-user', name: 'Transport', description: 'Fuel, taxis and vehicle costs', icon: 'CarFront', color: '#f43f5e', budget_amount: 1_000_000, budget_currency: 'UGX', archived: false, sort_order: 5, created_at: now(), updated_at: now() },
]

const demoQuotes: MoneyQuote[] = [
  { id: 'quote-1', text: 'Small savings today can create big opportunities tomorrow.', author: 'Cashbook', category: 'Saving', active: true, created_by: null, created_at: now(), updated_at: now() },
  { id: 'quote-2', text: 'A budget is telling your money where to go instead of wondering where it went.', author: 'Dave Ramsey', category: 'Budgeting', active: true, created_by: null, created_at: now(), updated_at: now() },
  { id: 'quote-3', text: 'Do not save what is left after spending; spend what is left after saving.', author: 'Warren Buffett', category: 'Saving', active: true, created_by: null, created_at: now(), updated_at: now() },
  { id: 'quote-4', text: 'Every expense you record is a decision you can improve tomorrow.', author: 'Cashbook', category: 'Mindset', active: true, created_by: null, created_at: now(), updated_at: now() },
  { id: 'quote-5', text: 'Financial freedom begins with financial awareness.', author: 'Cashbook', category: 'Motivation', active: true, created_by: null, created_at: now(), updated_at: now() },
]

function readLocal<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}
function writeLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep current-session state. */ }
}

export type AccountInput = Pick<MoneyAccount, 'name' | 'description' | 'icon' | 'color' | 'budget_amount' | 'budget_currency'>
export type ProfileInput = Pick<UserProfile, 'username' | 'full_name' | 'phone' | 'bio' | 'onboarding_completed'>

interface WorkspaceContextValue {
  accounts: MoneyAccount[]
  profile: UserProfile | null
  quotes: MoneyQuote[]
  notificationPreferences: NotificationPreferences | null
  isAdmin: boolean
  workspaceLoading: boolean
  refreshWorkspace: () => Promise<void>
  createAccount: (input: AccountInput) => Promise<void>
  updateAccount: (id: string, input: AccountInput) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  updateNotificationPreferences: (changes: Partial<NotificationPreferences>) => Promise<void>
  createQuote: (input: Pick<MoneyQuote, 'text' | 'author' | 'category' | 'active'>) => Promise<void>
  updateQuote: (id: string, changes: Partial<MoneyQuote>) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { config, user, isDemo, cloudStatus, reportCloudError } = useApp()
  const client = useMemo(() => getSupabaseClient(config), [config])
  const [accounts, setAccounts] = useState<MoneyAccount[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [quotes, setQuotes] = useState<MoneyQuote[]>([])
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)

  const loadDemo = useCallback(() => {
    if (!user) return
    setAccounts(readLocal(DEMO_ACCOUNTS_KEY, demoAccounts))
    setQuotes(readLocal(DEMO_QUOTES_KEY, demoQuotes))
    setProfile(readLocal(DEMO_PROFILE_KEY, {
      user_id: user.id,
      username: 'alex.m',
      full_name: 'Alex Mugisha',
      avatar_url: null,
      phone: '+256 700 123 456',
      bio: 'Building better money habits, one entry at a time.',
      onboarding_completed: true,
      created_at: now(),
      updated_at: now(),
    }))
    setNotificationPreferences(readLocal(DEMO_PREFS_KEY, {
      user_id: user.id,
      daily_reminder_enabled: true,
      daily_reminder_time: '19:00',
      quotes_enabled: true,
      expense_reminders_enabled: true,
      debt_reminders_enabled: true,
      push_enabled: true,
      updated_at: now(),
    }))
    setIsAdmin(true)
    setWorkspaceLoading(false)
  }, [user])

  const refreshWorkspace = useCallback(async () => {
    if (!user) return
    if (isDemo) return loadDemo()

    const fallbackProfile: UserProfile = {
      user_id: user.id,
      username: user.email.split('@')[0],
      full_name: user.email.split('@')[0],
      avatar_url: null,
      phone: null,
      bio: null,
      onboarding_completed: false,
      created_at: now(),
      updated_at: now(),
    }
    const fallbackPreferences: NotificationPreferences = {
      user_id: user.id,
      daily_reminder_enabled: false,
      daily_reminder_time: '19:00',
      quotes_enabled: true,
      expense_reminders_enabled: true,
      debt_reminders_enabled: true,
      push_enabled: false,
      updated_at: now(),
    }

    if (!client || cloudStatus !== 'ready') {
      setProfile(fallbackProfile)
      setNotificationPreferences(fallbackPreferences)
      setIsAdmin(false)
      setWorkspaceLoading(cloudStatus === 'checking')
      return
    }

    setWorkspaceLoading(true)
    try {
      const [accountsResult, profileResult, quotesResult, preferencesResult, roleResult] = await Promise.all([
        client.from('accounts').select('*').eq('user_id', user.id).order('sort_order'),
        client.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        client.from('money_quotes').select('*').order('created_at', { ascending: false }),
        client.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
        client.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
      ])
      const failed = [accountsResult, profileResult, quotesResult, preferencesResult, roleResult].find((result) => result.error)
      if (failed?.error) reportCloudError(failed.error, 'Your Supabase workspace could not be loaded.')

      setAccounts((accountsResult.data || []) as MoneyAccount[])
      setProfile((profileResult.data as UserProfile | null) || fallbackProfile)
      setQuotes((quotesResult.data || []) as MoneyQuote[])
      setNotificationPreferences((preferencesResult.data as NotificationPreferences | null) || fallbackPreferences)
      setIsAdmin(Boolean(roleResult.data))
    } catch (error) {
      reportCloudError(error, 'Your Supabase workspace could not be loaded.')
      setProfile(fallbackProfile)
      setNotificationPreferences(fallbackPreferences)
      setIsAdmin(false)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [client, cloudStatus, isDemo, loadDemo, reportCloudError, user])

  useEffect(() => {
    if (!user) {
      setAccounts([]); setProfile(null); setQuotes([]); setIsAdmin(false); setWorkspaceLoading(false)
      return
    }
    void refreshWorkspace()
    if (!client || isDemo || cloudStatus !== 'ready') return
    const channel = client.channel(`workspace:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` }, () => void refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => void refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'money_quotes' }, () => void refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` }, () => void refreshWorkspace())
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [client, cloudStatus, isDemo, refreshWorkspace, user])

  const getReadyClient = () => {
    if (!client || cloudStatus !== 'ready') {
      throw new Error('The Supabase workspace is not ready. Complete the database migrations or use demo mode.')
    }
    return client
  }
  const failCloudRequest = (error: unknown, fallback: string): never => {
    throw new Error(reportCloudError(error, fallback))
  }

  const createAccount = async (input: AccountInput) => {
    if (!user) throw new Error('Sign in to create an account.')
    const entry: MoneyAccount = { ...input, id: crypto.randomUUID(), user_id: user.id, archived: false, sort_order: accounts.length + 1, created_at: now(), updated_at: now() }
    if (isDemo) { const next = [...accounts, entry]; setAccounts(next); writeLocal(DEMO_ACCOUNTS_KEY, next); return }
    const database = getReadyClient()
    const { data, error } = await database.from('accounts').insert(entry).select().single()
    if (error) failCloudRequest(error, 'The account could not be created.')
    setAccounts((current) => [...current, data as MoneyAccount])
  }
  const updateAccount = async (id: string, input: AccountInput) => {
    const next = accounts.map((item) => item.id === id ? { ...item, ...input, updated_at: now() } : item)
    if (isDemo) { setAccounts(next); writeLocal(DEMO_ACCOUNTS_KEY, next); return }
    const database = getReadyClient()
    const { error } = await database.from('accounts').update(input).eq('id', id)
    if (error) failCloudRequest(error, 'The account could not be updated.')
    setAccounts(next)
  }
  const deleteAccount = async (id: string) => {
    const next = accounts.filter((item) => item.id !== id)
    if (isDemo) { setAccounts(next); writeLocal(DEMO_ACCOUNTS_KEY, next); return }
    const database = getReadyClient()
    const { error } = await database.from('accounts').delete().eq('id', id)
    if (error) failCloudRequest(error, 'The account could not be deleted.')
    setAccounts(next)
  }
  const updateProfile = async (input: ProfileInput) => {
    if (!user || !profile) throw new Error('Profile is unavailable.')
    const next = { ...profile, ...input, updated_at: now() }
    if (isDemo) { setProfile(next); writeLocal(DEMO_PROFILE_KEY, next); return }
    const database = getReadyClient()
    const { data, error } = await database.from('profiles').upsert(next, { onConflict: 'user_id' }).select().single()
    if (error) failCloudRequest(error, 'Your profile could not be updated.')
    setProfile(data as UserProfile)
  }
  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('Sign in to upload an avatar.')
    if (isDemo) {
      const url = URL.createObjectURL(file)
      if (profile) { const next = { ...profile, avatar_url: url }; setProfile(next) }
      return url
    }
    const database = getReadyClient()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${extension}`
    const { error } = await database.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) failCloudRequest(error, 'The avatar could not be uploaded.')
    const { data } = database.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`
    const { error: profileError } = await database.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id)
    if (profileError) failCloudRequest(profileError, 'The profile avatar could not be saved.')
    setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)
    return avatarUrl
  }
  const updateNotificationPreferences = async (changes: Partial<NotificationPreferences>) => {
    if (!user || !notificationPreferences) throw new Error('Preferences are unavailable.')
    const next = { ...notificationPreferences, ...changes, user_id: user.id, updated_at: now() }
    if (isDemo) { setNotificationPreferences(next); writeLocal(DEMO_PREFS_KEY, next); return }
    const database = getReadyClient()
    const { data, error } = await database.from('notification_preferences').upsert(next, { onConflict: 'user_id' }).select().single()
    if (error) failCloudRequest(error, 'Notification preferences could not be saved.')
    setNotificationPreferences(data as NotificationPreferences)
  }
  const createQuote = async (input: Pick<MoneyQuote, 'text' | 'author' | 'category' | 'active'>) => {
    if (!user || !isAdmin) throw new Error('Administrator access required.')
    const entry: MoneyQuote = { ...input, id: crypto.randomUUID(), created_by: user.id, created_at: now(), updated_at: now() }
    if (isDemo) { const next = [entry, ...quotes]; setQuotes(next); writeLocal(DEMO_QUOTES_KEY, next); return }
    const database = getReadyClient()
    const { data, error } = await database.from('money_quotes').insert(entry).select().single()
    if (error) failCloudRequest(error, 'The quote could not be created.')
    setQuotes((current) => [data as MoneyQuote, ...current])
  }
  const updateQuote = async (id: string, changes: Partial<MoneyQuote>) => {
    const next = quotes.map((item) => item.id === id ? { ...item, ...changes, updated_at: now() } : item)
    if (isDemo) { setQuotes(next); writeLocal(DEMO_QUOTES_KEY, next); return }
    if (!isAdmin) throw new Error('Administrator access required.')
    const database = getReadyClient()
    const { error } = await database.from('money_quotes').update(changes).eq('id', id)
    if (error) failCloudRequest(error, 'The quote could not be updated.')
    setQuotes(next)
  }
  const deleteQuote = async (id: string) => {
    const next = quotes.filter((item) => item.id !== id)
    if (isDemo) { setQuotes(next); writeLocal(DEMO_QUOTES_KEY, next); return }
    if (!isAdmin) throw new Error('Administrator access required.')
    const database = getReadyClient()
    const { error } = await database.from('money_quotes').delete().eq('id', id)
    if (error) failCloudRequest(error, 'The quote could not be deleted.')
    setQuotes(next)
  }

  const value: WorkspaceContextValue = { accounts, profile, quotes, notificationPreferences, isAdmin, workspaceLoading, refreshWorkspace, createAccount, updateAccount, deleteAccount, updateProfile, uploadAvatar, updateNotificationPreferences, createQuote, updateQuote, deleteQuote }
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}
