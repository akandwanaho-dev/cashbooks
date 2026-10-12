import { useEffect, useState, type FormEvent } from 'react'
import { BellRing, Check, Lightbulb, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { scheduleDailyReminder } from '@/services/notificationService'

export default function OnboardingDialog() {
  const { profile, notificationPreferences, updateProfile, updateNotificationPreferences } = useWorkspace()
  const [name, setName] = useState('')
  const [daily, setDaily] = useState(true)
  const [quotes, setQuotes] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (profile) setName(profile.full_name) }, [profile])
  const open = Boolean(profile && !profile.onboarding_completed)

  const finish = async (event: FormEvent) => {
    event.preventDefault(); if (!profile) return; setSaving(true)
    try {
      await updateProfile({ username: profile.username, full_name: name.trim() || profile.full_name, phone: profile.phone, bio: profile.bio, onboarding_completed: true })
      if (notificationPreferences) await updateNotificationPreferences({ daily_reminder_enabled: daily, quotes_enabled: quotes })
      if (daily) await scheduleDailyReminder(notificationPreferences?.daily_reminder_time || '19:00').catch(() => undefined)
      toast.success('Your Cashbook is ready')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not finish setup.') }
    finally { setSaving(false) }
  }

  return <Dialog open={open}><DialogContent className="max-w-lg" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}><DialogHeader><span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"><Sparkles className="h-5 w-5" /></span><DialogTitle>Make Cashbook yours</DialogTitle><DialogDescription>Choose your name and the useful reminders you want. Everything can be changed later.</DialogDescription></DialogHeader><form id="onboarding-form" onSubmit={finish} className="space-y-4"><div className="space-y-2"><Label htmlFor="onboarding-name">What should we call you?</Label><Input id="onboarding-name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></div><button type="button" onClick={() => setDaily((value) => !value)} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950"><BellRing className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-semibold">Daily expense reminder</span><span className="mt-0.5 block text-xs text-muted-foreground">Remember to log today’s spending.</span></span><span className={`grid h-5 w-5 place-items-center rounded-md ${daily ? 'bg-emerald-500 text-white' : 'border'}`}>{daily && <Check className="h-3.5 w-3.5" />}</span></button><button type="button" onClick={() => setQuotes((value) => !value)} className="flex w-full items-center gap-3 rounded-xl border p-4 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950"><Lightbulb className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-semibold">Money motivation</span><span className="mt-0.5 block text-xs text-muted-foreground">Receive thoughtful daily money quotes.</span></span><span className={`grid h-5 w-5 place-items-center rounded-md ${quotes ? 'bg-emerald-500 text-white' : 'border'}`}>{quotes && <Check className="h-3.5 w-3.5" />}</span></button></form><DialogFooter><Button variant="primary" className="w-full" form="onboarding-form" type="submit" disabled={saving}>{saving ? 'Preparing your workspace…' : 'Continue to Cashbook'}</Button></DialogFooter></DialogContent></Dialog>
}
