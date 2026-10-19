import { useState } from 'react'
import { AlertTriangle, BellRing, BookOpenText, ChevronDown, CloudUpload, Download, Info, LayoutDashboard, Lightbulb, LogOut, Menu, Plus, Settings, ShieldCheck, UserRound, WalletCards, WifiOff, X, Zap } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import OnboardingDialog from '@/components/OnboardingDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import TransactionDialog from '@/components/TransactionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { CurrencyCode } from '@/types'
import { cn, initials } from '@/lib/utils'

const navigation = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Accounts', href: '/accounts', icon: WalletCards },
  { label: 'Expenses', href: '/expenses', icon: BookOpenText },
  { label: 'Notifications', href: '/notifications', icon: BellRing },
  { label: 'Money Quotes', href: '/quotes', icon: Lightbulb },
  { label: 'Profile', href: '/profile', icon: UserRound },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Downloads', href: '/downloads', icon: Download },
  { label: 'About & Creators', href: '/about', icon: Info },
]

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Here’s how your cash is moving.' },
  '/accounts': { title: 'Accounts', subtitle: 'Organize money into clear expense boxes.' },
  '/expenses': { title: 'Expenses', subtitle: 'Review, filter, and reconcile every record.' },
  '/ledger': { title: 'Expenses', subtitle: 'Review, filter, and reconcile every record.' },
  '/notifications': { title: 'Notifications', subtitle: 'Choose useful reminders and motivation.' },
  '/quotes': { title: 'Money Quotes', subtitle: 'Build a healthier financial mindset.' },
  '/profile': { title: 'Profile', subtitle: 'Manage your identity and personal details.' },
  '/settings': { title: 'Settings', subtitle: 'Manage your personal Cashbook preferences.' },
  '/downloads': { title: 'Downloads', subtitle: 'Get verified Cashbook application builds.' },
  '/about': { title: 'About', subtitle: 'Meet the people and purpose behind Cashbook.' },
}

function SidebarContent({ close }: { close?: () => void }) {
  const { isDemo, isOnline, isSyncing, pendingChanges, cloudStatus, syncNow } = useApp()
  const { isAdmin } = useWorkspace()
  const status = isDemo ? 'DEMO' : cloudStatus === 'error' ? 'SETUP' : cloudStatus === 'checking' ? 'CHECKING' : !isOnline ? 'OFFLINE' : isSyncing ? 'SYNCING' : pendingChanges ? `${pendingChanges} QUEUED` : 'LIVE'
  const statusColor = isDemo || cloudStatus === 'error' || !isOnline || pendingChanges ? 'text-amber-400' : 'text-emerald-400'
  return (
    <>
      <div className="flex h-20 items-center px-6"><Logo /></div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-500">Workspace</p>
        <nav className="space-y-1">
          {navigation.map(({ label, href, icon: Icon }) => (
            <NavLink key={href} to={href} end={href === '/'} onClick={close} className={({ isActive }) => cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-950/10' : 'text-zinc-400 hover:bg-white/[.06] hover:text-zinc-100')}>
              <Icon className="h-[18px] w-[18px]" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {isAdmin && <div className="mt-5 border-t border-white/[.08] pt-4"><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-zinc-600">Administration</p><NavLink to="/admin" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-white/[.06]"><ShieldCheck className="h-[18px] w-[18px]" />Admin console</NavLink></div>}
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/[.08] bg-white/[.04] p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-zinc-300">Sync status</span><span className={cn('flex items-center gap-1.5 text-[10px] font-semibold', statusColor)}>{!isOnline && !isDemo ? <WifiOff className="h-3 w-3" /> : <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50"/><span className="relative inline-flex h-2 w-2 rounded-full bg-current"/></span>}{status}</span></div>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">{isDemo ? 'Changes are saved on this device.' : cloudStatus === 'error' ? 'Supabase needs the Cashbook migrations before cloud sync can start.' : cloudStatus === 'checking' ? 'Checking the Supabase database schema.' : !isOnline ? 'Entries are cached and will sync when online.' : pendingChanges ? 'Offline changes are ready to upload.' : 'Your ledger is synced with Supabase.'}</p>
          {!isDemo && isOnline && cloudStatus === 'ready' && pendingChanges > 0 && <button onClick={() => void syncNow()} className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"><CloudUpload className="h-3.5 w-3.5" />Sync now</button>}
        </div>
        <p className="mt-4 px-2 text-[10px] text-zinc-600">Cashbook v1.0 · Private by default</p>
      </div>
    </>
  )
}

export default function AppLayout() {
  const { user, signOut, isDemo, isOnline, pendingChanges, cloudStatus, cloudError, enableDemo } = useApp()
  const { preferredCurrency, currencies, setPreferredCurrency } = useCurrency()
  const { profile } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [transactionOpen, setTransactionOpen] = useState(false)
  const meta = pageMeta[location.pathname] || pageMeta['/']

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Signed out')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col bg-zinc-950 text-white lg:flex"><SidebarContent /></aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
          <aside className="relative flex h-full w-[285px] animate-fade-up flex-col bg-zinc-950 text-white shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-6 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            <SidebarContent close={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-20 items-center border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="mr-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h1 className="truncate text-lg font-bold tracking-[-.02em] sm:text-xl">{meta.title}</h1>{isDemo && <Badge variant="secondary" className="hidden sm:inline-flex">Demo</Badge>}</div>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span className="mr-2 hidden text-xs text-muted-foreground xl:block">{format(new Date(), 'EEEE, MMMM d')}</span>
            {!isDemo && !isOnline && <Badge variant="danger" className="px-2"><WifiOff className="h-3 w-3" /><span className="hidden sm:inline">Offline</span></Badge>}
            {!isDemo && isOnline && pendingChanges > 0 && <Badge variant="secondary" className="hidden sm:inline-flex"><CloudUpload className="h-3 w-3" />{pendingChanges} queued</Badge>}
            <Select value={preferredCurrency} onValueChange={(value) => void setPreferredCurrency(value as CurrencyCode)}>
              <SelectTrigger aria-label="Display currency" className="h-9 w-[78px] border-0 bg-muted/70 px-2.5 text-xs font-bold shadow-none sm:w-[88px]"><SelectValue /></SelectTrigger>
              <SelectContent align="end">{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.code} · {currency.name}</SelectItem>)}</SelectContent>
            </Select>
            <ThemeToggle />
            <Button variant="primary" size="sm" className="h-10 px-3 sm:px-4" onClick={() => setTransactionOpen(true)}><Plus className="h-4 w-4" /><span className="hidden sm:inline">New entry</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Account menu">
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(profile?.full_name || user?.email)}</span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block text-xs font-normal text-muted-foreground">Signed in as</span>
                  <span className="mt-0.5 block max-w-48 truncate">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/profile')}><UserRound className="h-4 w-4" />Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings className="h-4 w-4" />Settings</DropdownMenuItem>
                <DropdownMenuItem disabled><Zap className="h-4 w-4" />{isDemo ? 'Demo workspace' : 'Realtime connected'}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut} className="text-rose-600 focus:text-rose-600"><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {!isDemo && cloudError && <div role="alert" className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 sm:mx-6 sm:flex-row sm:items-center lg:mx-8"><div className="flex min-w-0 gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" /><div><p className="text-sm font-semibold">Supabase setup required</p><p className="mt-1 text-xs leading-5 opacity-80">{cloudError}</p></div></div><Button type="button" variant="outline" size="sm" className="shrink-0 sm:ml-auto" onClick={() => { enableDemo(); toast.success('Demo workspace opened') }}>Use demo mode</Button></div>}
        {!isDemo && cloudStatus === 'checking' && <div className="mx-4 mt-4 rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:mx-6 lg:mx-8">Checking Supabase database setup…</div>}

        <main className="min-h-[calc(100vh-5rem)] p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>

      <TransactionDialog open={transactionOpen} onOpenChange={setTransactionOpen} />
      <OnboardingDialog />
    </div>
  )
}
