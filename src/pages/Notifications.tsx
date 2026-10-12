import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Clock3, Lightbulb, Send, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cancelDailyReminder, cancelMotivationalQuotes, getReminderPreferences, scheduleDailyReminder, scheduleMotivationalQuotes, sendTestNotification } from '@/services/notificationService'

function ToggleRow({ title, description, checked, onChange, icon: Icon }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void; icon: typeof BellRing }) {
  return <div className="flex items-center gap-3 rounded-xl border p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p></div><button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} /></button></div>
}

export default function NotificationsPage() {
  const { quotes, notificationPreferences, updateNotificationPreferences } = useWorkspace()
  const [dailyTime, setDailyTime] = useState('19:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => { getReminderPreferences().then((settings) => setDailyTime(settings.dailyTime)).catch(() => undefined) }, [])
  if (!notificationPreferences) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />

  const update = async (changes: Partial<typeof notificationPreferences>) => {
    try { await updateNotificationPreferences(changes) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update preferences.') }
  }

  const saveNativeSchedule = async () => {
    setSaving(true)
    try {
      if (notificationPreferences.daily_reminder_enabled) await scheduleDailyReminder(dailyTime)
      else await cancelDailyReminder()
      if (notificationPreferences.quotes_enabled) await scheduleMotivationalQuotes(quotes, '08:00')
      else await cancelMotivationalQuotes()
      await updateNotificationPreferences({ daily_reminder_time: dailyTime, push_enabled: true })
      toast.success('Notification schedule updated')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not schedule notifications.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-muted-foreground">Stay consistent without the noise</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Notifications & reminders</h2></div><Button variant="outline" onClick={() => void sendTestNotification().then(() => toast.success('Test notification queued')).catch((error) => toast.error(error.message))}><Send className="h-4 w-4" />Send test</Button></section>
    <Card><CardHeader><CardTitle>Your notification choices</CardTitle><CardDescription>Change any option at any time. Native permission is requested only when you save.</CardDescription></CardHeader><CardContent className="space-y-3">
      <ToggleRow title="Daily expense reminder" description="A gentle prompt to record today’s spending." checked={notificationPreferences.daily_reminder_enabled} onChange={(value) => void update({ daily_reminder_enabled: value })} icon={WalletCards} />
      <ToggleRow title="Money motivation quotes" description="Start the day with one useful financial thought." checked={notificationPreferences.quotes_enabled} onChange={(value) => void update({ quotes_enabled: value })} icon={Lightbulb} />
      <ToggleRow title="Loan and debt alerts" description="Notify before a saved payment due date." checked={notificationPreferences.debt_reminders_enabled} onChange={(value) => void update({ debt_reminders_enabled: value })} icon={BellRing} />
      <ToggleRow title="Expense and budget alerts" description="Receive useful reminders when budgets need attention." checked={notificationPreferences.expense_reminders_enabled} onChange={(value) => void update({ expense_reminders_enabled: value })} icon={CheckCircle2} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Schedule</CardTitle><CardDescription>Times use the device’s current timezone.</CardDescription></CardHeader><CardContent><div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="notification-time">Daily expense reminder</Label><div className="relative max-w-56"><Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="notification-time" type="time" value={dailyTime} onChange={(event) => setDailyTime(event.target.value)} className="pl-10" /></div></div><Button variant="primary" onClick={saveNativeSchedule} disabled={saving}>{saving ? 'Saving…' : 'Save native schedule'}</Button></div><p className="mt-4 text-xs leading-5 text-muted-foreground">On Android and iOS, reminders are registered with the operating system and can fire while Cashbook is closed. Desktop notification behavior depends on the system background settings.</p></CardContent></Card>
  </div>
}
