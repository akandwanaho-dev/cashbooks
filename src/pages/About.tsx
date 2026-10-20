import { ClipboardList, Code2, Github, Heart, Landmark, Mail, PenTool, ShieldCheck, Smartphone, Workflow } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAppSetting } from '@/hooks/useAppSetting'
import { pageSettingsDefaults, type PageSettings } from '@/lib/globalSettings'

const memberKeys = [
  ['member_1_name', 'member_1_role'],
  ['member_2_name', 'member_2_role'],
  ['member_3_name', 'member_3_role'],
  ['member_4_name', 'member_4_role'],
  ['member_5_name', 'member_5_role'],
  ['member_6_name', 'member_6_role'],
] as const satisfies ReadonlyArray<readonly [keyof PageSettings, keyof PageSettings]>

const memberIcons = [PenTool, Code2, ClipboardList, Code2, Workflow, Github] as const

export default function AboutPage() {
  const settings = useAppSetting('pages', pageSettingsDefaults)
  const teamMembers = memberKeys.map(([nameKey, roleKey], index) => ({
    name: settings[nameKey],
    role: settings[roleKey],
    icon: memberIcons[index],
  })).filter((member) => member.name.trim())

  return <div className="mx-auto max-w-5xl space-y-8 animate-fade-up">
    <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-14 text-center text-white sm:px-12">
      <div className="absolute inset-0 subtle-grid opacity-20" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="relative">
        <Logo className="mx-auto w-fit" />
        <Badge className="mt-8 border-white/10 bg-white/10 text-zinc-300">Version 1.0.0</Badge>
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-[-.04em] sm:text-5xl">{settings.about_heading}</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400">{settings.about_description}</p>
      </div>
    </section>

    <section>
      <div className="text-center">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{settings.team_label}</p>
        <h3 className="mt-2 text-2xl font-bold">{settings.team_heading}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{settings.team_description}</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map(({ name, role, icon: Icon }) => <Card key={name}>
          <CardContent className="p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Icon className="h-5 w-5" /></span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{role}</p>
            <h4 className="mt-1 font-bold">{name}</h4>
          </CardContent>
        </Card>)}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Administrators can update every team member and role from Admin Console → Pages.</p>
    </section>

    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-card p-5"><Landmark className="h-5 w-5 text-emerald-500" /><p className="mt-3 font-semibold">Your data, your account</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Private financial records are isolated per user.</p></div>
      <div className="rounded-2xl border bg-card p-5"><Heart className="h-5 w-5 text-rose-500" /><p className="mt-3 font-semibold">Made for real life</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Fast enough for a daily habit and flexible enough to grow.</p></div>
      <div className="rounded-2xl border bg-card p-5"><ShieldCheck className="h-5 w-5 text-sky-500" /><p className="mt-3 font-semibold">Private by design</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Authentication and Row Level Security protect every account.</p></div>
    </section>

    <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-center sm:flex-row sm:text-left">
      <div><p className="font-semibold">Cashbook support</p><p className="mt-1 text-xs text-muted-foreground">Questions, feedback, or help with your account.</p></div>
      <a href={`mailto:${settings.support_email}`} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"><Mail className="h-4 w-4" />{settings.support_email}</a>
    </section>

    <footer className="flex flex-col items-center justify-center gap-2 pb-4 text-center text-xs text-muted-foreground sm:flex-row">
      <Smartphone className="h-3.5 w-3.5" />
      <span>© {new Date().getFullYear()} Cashbook. Group Six: {teamMembers.map((member) => member.name).join(', ')}.</span>
    </footer>
  </div>
}
