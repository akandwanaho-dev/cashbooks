import { useEffect, useState } from 'react'
import { BellRing, FileText, MessageSquareWarning, Palette, Save, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/contexts/AppContext'
import { getSupabaseClient } from '@/lib/supabaseClient'

const definitions = {
  notifications: { title: 'Notification defaults', description: 'Control default reminder copy and schedules.', icon: BellRing, fields: { daily_time: '19:00', daily_title: 'Keep your cashbook current', daily_message: "Don't forget to log today's expenses.", quote_time: '08:00' } },
  themes: { title: 'Global theme', description: 'Set the product colors presented to new users.', icon: Palette, fields: { primary_color: '#10b981', accent_color: '#0ea5e9', default_mode: 'system', allow_user_override: 'true' } },
  pages: { title: 'Page content', description: 'Customize key application headings and creator information.', icon: FileText, fields: { welcome_heading: 'Know exactly where your money goes.', about_heading: 'Better money habits, made simple.', creator_name: 'Cashbook Studio', support_email: 'support@cashbook.app' } },
  errors: { title: 'Error messages', description: 'Make failures clear, useful and human.', icon: MessageSquareWarning, fields: { network_error: 'You are offline. Changes will sync when your connection returns.', auth_error: 'We could not sign you in. Check your details and try again.', general_error: 'Something went wrong. Your saved data is safe.' } },
  settings: { title: 'Application settings', description: 'Manage global branding and operational configuration.', icon: Settings, fields: { app_name: 'Cashbook', copyright: `© ${new Date().getFullYear()} Cashbook Studio`, maintenance_mode: 'false', support_url: 'https://cashbook.app/support' } },
} as const

export default function AdminConfig({ section }: { section: keyof typeof definitions }) {
  const { config, isDemo, user } = useApp()
  const client = getSupabaseClient(config)
  const definition = definitions[section]
  const [values, setValues] = useState<Record<string, string>>({ ...definition.fields })
  const [saving, setSaving] = useState(false)
  const Icon = definition.icon

  useEffect(() => {
    setValues({ ...definition.fields })
    if (isDemo) {
      try { const saved = localStorage.getItem(`cashbook.admin.${section}`); if (saved) setValues(JSON.parse(saved)) } catch { /* defaults */ }
      return
    }
    if (client) client.from('app_settings').select('value').eq('setting_key', section).maybeSingle().then(({ data }) => { if (data?.value) setValues({ ...definition.fields, ...data.value }) })
  }, [client, definition.fields, isDemo, section])

  const save = async () => {
    setSaving(true)
    try {
      if (isDemo) localStorage.setItem(`cashbook.admin.${section}`, JSON.stringify(values))
      else if (client) {
        const { error } = await client.from('app_settings').upsert({ setting_key: section, value: values, updated_by: user?.id }, { onConflict: 'setting_key' })
        if (error) throw error
      }
      window.dispatchEvent(new Event('cashbook-global-config-updated'))
      toast.success('Configuration saved')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save configuration.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl space-y-6 animate-fade-up"><section><p className="text-sm text-muted-foreground">Global application configuration</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em]">{definition.title}</h2></section><Card><CardHeader><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><Icon className="h-[18px] w-[18px]" /></span><div><CardTitle>{definition.title}</CardTitle><CardDescription className="mt-1">{definition.description}</CardDescription></div></div></CardHeader><CardContent className="space-y-5">{Object.entries(values).map(([key, value]) => <div key={key} className="space-y-2"><Label htmlFor={key}>{key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Label>{value.length > 70 ? <textarea id={key} rows={3} value={value} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500" /> : <Input id={key} type={key.includes('color') ? 'color' : key.includes('time') ? 'time' : 'text'} value={value} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className={key.includes('color') ? 'h-11 max-w-28 p-1' : ''} />}</div>)}<Button variant="primary" onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save configuration'}</Button></CardContent></Card></div>
}
