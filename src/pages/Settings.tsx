import { useEffect, useState } from 'react'
import { BellRing, Check, Database, ExternalLink, Globe2, Laptop, Moon, RotateCcw, Send, ShieldCheck, Sun, TriangleAlert, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { applyTheme, getTheme, type Theme } from '@/lib/theme'
import { cancelDailyReminder, getReminderPreferences, scheduleDailyReminder, sendTestNotification } from '@/services/notificationService'
import type { CurrencyCode } from '@/types'
import { cn, initials } from '@/lib/utils'

const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export default function SettingsPage() {
  const { config, user, isDemo, resetConfiguration } = useApp()
  const { isAdmin } = useWorkspace()
  const { preferredCurrency, currencies, ratesUpdatedAt, rateToUGX, formatMoney, setPreferredCurrency } = useCurrency()
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [dailyEnabled, setDailyEnabled] = useState(false)
  const [dailyTime, setDailyTime] = useState('19:00')
  const [savingReminder, setSavingReminder] = useState(false)

  useEffect(() => {
    getReminderPreferences().then((settings) => {
      setDailyEnabled(settings.dailyEnabled)
      setDailyTime(settings.dailyTime)
    }).catch(() => undefined)
  }, [])

  const chooseTheme = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
    toast.success(`${next.charAt(0).toUpperCase() + next.slice(1)} theme applied`)
  }

  const saveDailyReminder = async () => {
    setSavingReminder(true)
    try {
      const result = await scheduleDailyReminder(dailyTime)
      setDailyEnabled(true)
      if (result?.warning) toast.warning(result.warning.message)
      else toast.success(result ? 'Daily native reminder scheduled' : 'Reminder preference saved for native builds')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not schedule the reminder.')
    } finally {
      setSavingReminder(false)
    }
  }

  const disableDailyReminder = async () => {
    await cancelDailyReminder()
    setDailyEnabled(false)
    toast.success('Daily reminder disabled')
  }

  const testNotification = async () => {
    try {
      await sendTestNotification()
      toast.success('Test notification queued')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notifications are unavailable.')
    }
  }

  const reset = async () => {
    setResetting(true)
    try {
      await resetConfiguration()
      toast.success('Database configuration removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reset configuration.')
    } finally {
      setResetting(false)
    }
  }

  const connectionHost = config?.mode === 'supabase' ? new URL(config.url).hostname : 'Local demo data'

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      <section><h2 className="text-2xl font-bold tracking-[-.035em] sm:text-3xl">Settings</h2><p className="mt-1 text-sm text-muted-foreground">Manage your cash book preferences.</p></section>

      <Card>
        <CardHeader className="border-b"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"><UserRound className="h-[18px] w-[18px]" /></span><div><CardTitle>Account</CardTitle><CardDescription className="mt-1">Your signed-in workspace identity</CardDescription></div></div></CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{initials(user?.email)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.email}</p><p className="mt-0.5 text-xs text-muted-foreground">{isDemo ? 'Demo workspace' : 'Secure Cashbook account'}</p></div>{isDemo ? <Badge variant="secondary" className="ml-auto">Preview</Badge> : <Badge variant="success" className="ml-auto"><Check className="h-3 w-3" />Verified</Badge>}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"><Globe2 className="h-[18px] w-[18px]" /></span><div><CardTitle>Currency</CardTitle><CardDescription className="mt-1">UGX is the default; switch reporting currency without rewriting history.</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="display-currency">Global display currency</Label>
            <Select value={preferredCurrency} onValueChange={(value) => void setPreferredCurrency(value as CurrencyCode)}>
              <SelectTrigger id="display-currency" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.code} · {currency.name} ({currency.symbol})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border bg-muted/25 p-4 text-xs leading-5 text-muted-foreground">
            <strong className="text-foreground">Historical-safe conversion.</strong> Each entry stores its original ISO currency and the exact rate used on entry. Current totals convert to {preferredCurrency}. {preferredCurrency !== 'UGX' && <>Reference: 1 {preferredCurrency} = {formatMoney(rateToUGX(preferredCurrency), 'UGX')}.</>}
            <span className="mt-1 block text-[11px]">Rates: {ratesUpdatedAt}. Update production rates through a trusted backend function.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"><BellRing className="h-[18px] w-[18px]" /></span><div><CardTitle>Native reminders</CardTitle><CardDescription className="mt-1">Schedule a daily prompt through Android Alarm Manager or iOS Notification Center.</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2"><Label htmlFor="daily-time">Daily bookkeeping time</Label><Input id="daily-time" type="time" value={dailyTime} onChange={(event) => setDailyTime(event.target.value)} className="h-11 sm:max-w-48" /></div>
            <div className="flex flex-wrap gap-2"><Button variant="primary" onClick={saveDailyReminder} disabled={savingReminder}>{savingReminder ? 'Scheduling…' : dailyEnabled ? 'Update reminder' : 'Enable reminder'}</Button>{dailyEnabled && <Button variant="outline" onClick={disableDailyReminder}>Disable</Button>}<Button variant="ghost" onClick={testNotification}><Send className="h-4 w-4" />Test</Button></div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Loan and debt screens can call <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">scheduleDebtReminder()</code> with a due date. Mobile reminders are registered with the native OS and can fire while the app is closed.</p>
        </CardContent>
      </Card>

      {isAdmin && <Card>
        <CardHeader className="border-b"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Database className="h-[18px] w-[18px]" /></span><div><CardTitle>Database connection</CardTitle><CardDescription className="mt-1">Administrator-only Supabase controls</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col gap-4 rounded-xl border bg-muted/25 p-4 sm:flex-row sm:items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-background"><span className={`h-2.5 w-2.5 rounded-full ${isDemo ? 'bg-amber-400' : 'bg-emerald-500'}`} /></div>
            <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{connectionHost}</p><Badge variant={isDemo ? 'secondary' : 'success'}>{isDemo ? 'Demo' : 'Connected'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{config?.mode === 'supabase' ? config.source === 'environment' ? 'Managed by Vite environment variables' : 'Configuration stored only in this browser' : 'Seeded preview data stored in localStorage'}</p></div>
          </div>
          <div className="flex gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" /><div><p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Protected by Row Level Security</p><p className="mt-1 text-xs leading-5 text-emerald-800/75 dark:text-emerald-300/70">The browser uses only your publishable key. Supabase RLS restricts every database operation to the signed-in user.</p></div></div>
          <div className="flex flex-wrap gap-2">
            {config?.source !== 'environment' && <Button variant="outline" onClick={() => setResetOpen(true)}><RotateCcw className="h-4 w-4" />{isDemo ? 'Connect Supabase' : 'Change database'}</Button>}
            <Button variant="ghost" asChild><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase <ExternalLink className="h-4 w-4" /></a></Button>
          </div>
        </CardContent>
      </Card>}

      <Card>
        <CardHeader className="border-b"><CardTitle>Appearance</CardTitle><CardDescription>Choose how Cashbook looks on this device.</CardDescription></CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-3">{themes.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => chooseTheme(value)} className={cn('relative flex items-center gap-3 rounded-xl border p-4 text-left transition hover:bg-muted/50', theme === value && 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10 dark:bg-emerald-950/20')}><span className={cn('grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground', theme === value && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400')}><Icon className="h-[17px] w-[17px]" /></span><span className="text-sm font-semibold">{label}</span>{theme === value && <Check className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />}</button>)}</div>
        </CardContent>
      </Card>

      {isAdmin && <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"><TriangleAlert className="h-[18px] w-[18px]" /></span><DialogTitle>{isDemo ? 'Connect a live database?' : 'Change database connection?'}</DialogTitle><DialogDescription>{isDemo ? 'This exits the demo and returns to database setup. Your demo entries stay in this browser.' : 'You will be signed out and the saved project URL and publishable key will be removed from this browser. Your Supabase data will not be deleted.'}</DialogDescription></DialogHeader>
          <DialogFooter className="mt-3"><Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="destructive" onClick={reset} disabled={resetting}>{resetting ? 'Resetting…' : 'Continue'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>}
    </div>
  )
}
