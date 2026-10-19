import { Code2, Github, Heart, Landmark, Mail, PenTool, ShieldCheck, Smartphone, Workflow } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const teamMembers = [
  'Kuwoto Jaden',
  'Sakari Emmanuel',
  'Ana Frida',
  'Adewale Benjamin',
  'Otim Henry',
] as const

const responsibilities = [
  { title: 'UI design', description: 'Designing a clear, accessible, and responsive financial experience.', icon: PenTool },
  { title: 'Programming', description: 'Building and maintaining the web, mobile, and desktop application.', icon: Code2 },
  { title: 'Planning & system flow', description: 'Planning features, user journeys, application structure, and data flow.', icon: Workflow },
  { title: 'GitHub management', description: 'Maintaining source control, commits, reviews, and release history.', icon: Github },
] as const

export default function AboutPage() {
  return <div className="mx-auto max-w-5xl space-y-8 animate-fade-up">
    <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-6 py-14 text-center text-white sm:px-12">
      <div className="absolute inset-0 subtle-grid opacity-20" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="relative">
        <Logo className="mx-auto w-fit" />
        <Badge className="mt-8 border-white/10 bg-white/10 text-zinc-300">Version 1.0.0</Badge>
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-[-.04em] sm:text-5xl">Better money habits, made simple.</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-400">Cashbook helps people and small businesses understand every shilling, organize expenses, and build a calmer financial future.</p>
      </div>
    </section>

    <section>
      <div className="text-center">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Built with purpose</p>
        <h3 className="mt-2 text-2xl font-bold">Design & development team</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">The people who planned, designed, programmed, and maintained Cashbook.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {teamMembers.map((name) => <Card key={name}>
          <CardContent className="p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Code2 className="h-5 w-5" /></span>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cashbook team</p>
            <h4 className="mt-1 font-bold">{name}</h4>
          </CardContent>
        </Card>)}
      </div>
    </section>

    <section>
      <div><p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">How the team contributes</p><h3 className="mt-1 text-2xl font-bold">Team responsibilities</h3></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {responsibilities.map(({ title, description, icon: Icon }) => <div key={title} className="flex gap-4 rounded-2xl border bg-card p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-emerald-600 dark:text-emerald-400"><Icon className="h-[18px] w-[18px]" /></span><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>)}
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-card p-5"><Landmark className="h-5 w-5 text-emerald-500" /><p className="mt-3 font-semibold">Your data, your account</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Private financial records are isolated per user.</p></div>
      <div className="rounded-2xl border bg-card p-5"><Heart className="h-5 w-5 text-rose-500" /><p className="mt-3 font-semibold">Made for real life</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Fast enough for a daily habit and flexible enough to grow.</p></div>
      <div className="rounded-2xl border bg-card p-5"><ShieldCheck className="h-5 w-5 text-sky-500" /><p className="mt-3 font-semibold">Private by design</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Authentication and Row Level Security protect every account.</p></div>
    </section>

    <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border bg-card p-5 text-center sm:flex-row sm:text-left">
      <div><p className="font-semibold">Cashbook support</p><p className="mt-1 text-xs text-muted-foreground">Questions, feedback, or help with your account.</p></div>
      <a href="mailto:support@cashbook.app" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"><Mail className="h-4 w-4" />support@cashbook.app</a>
    </section>

    <footer className="flex flex-col items-center justify-center gap-2 pb-4 text-center text-xs text-muted-foreground sm:flex-row">
      <Smartphone className="h-3.5 w-3.5" />
      <span>© {new Date().getFullYear()} Cashbook. Designed and developed by {teamMembers.join(', ')}.</span>
    </footer>
  </div>
}
