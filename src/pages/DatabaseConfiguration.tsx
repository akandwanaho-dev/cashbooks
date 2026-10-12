import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Database, Eye, EyeOff, KeyRound, LockKeyhole, PlayCircle, Server, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/contexts/AppContext'
import { testSupabaseConnection } from '@/lib/supabaseClient'

export default function DatabaseConfiguration() {
  const { configureSupabase, enableDemo } = useApp()
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const connect = async (event: FormEvent) => {
    event.preventDefault()
    setConnecting(true)
    try {
      await testSupabaseConnection(url, anonKey)
      configureSupabase(url, anonKey)
      toast.success('Database connected securely')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not connect to Supabase.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 subtle-grid [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-5 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[.85fr_1.15fr] lg:px-8 lg:py-12">
        <div className="max-w-lg animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Private by design · RLS protected
          </div>
          <h1 className="text-4xl font-bold tracking-[-.045em] sm:text-5xl lg:text-[58px] lg:leading-[1.04]">
            Your books.<br /><span className="text-muted-foreground">Your database.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            Connect your Supabase project to keep every receipt, payment, and balance in infrastructure you control.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"><LockKeyhole className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold">Row-level security</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Each user only sees their own ledger.</p></div>
            </div>
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"><Database className="h-4 w-4" /></span>
              <div><p className="text-sm font-semibold">Realtime sync</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Changes appear everywhere instantly.</p></div>
            </div>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:100ms]">
          <div className="overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-slate-900/10 dark:shadow-black/40">
            <div className="border-b bg-muted/35 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border bg-background text-emerald-500"><Server className="h-[18px] w-[18px]" /></span>
                <div><h2 className="font-semibold tracking-tight">Connect your database</h2><p className="mt-0.5 text-xs text-muted-foreground">Usually takes less than a minute</p></div>
              </div>
            </div>
            <form onSubmit={connect} className="space-y-5 p-6 sm:p-8">
              <div className="space-y-2">
                <Label htmlFor="project-url">Supabase project URL</Label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="project-url" type="url" required autoComplete="url" placeholder="https://your-project.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 pl-10" />
                </div>
                <p className="text-xs text-muted-foreground">Project settings → Data API → Project URL</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label htmlFor="anon-key">Anon / publishable key</Label><span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Browser-safe key only</span></div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="anon-key" type={showKey ? 'text' : 'password'} required autoComplete="off" placeholder="eyJhbGciOi... or sb_publishable_..." value={anonKey} onChange={(e) => setAnonKey(e.target.value)} className="h-11 px-10 font-mono text-xs" />
                  <button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Hide key' : 'Show key'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3.5 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
                <strong>Never use a service_role key.</strong> Your publishable key is stored only in this browser. Data protection comes from the included Supabase RLS policies.
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={connecting}>
                {connecting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Testing connection…</> : <>Connect database <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <div className="relative py-1"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">or preview first</span></div></div>
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => { enableDemo(); toast.success('Demo workspace ready') }}>
                <PlayCircle className="h-4 w-4 text-emerald-500" /> Explore demo workspace
              </Button>
            </form>
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />No tracking</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Local configuration</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Open setup</span>
          </div>
        </div>
      </section>
    </main>
  )
}
