import { useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, Check, Download, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/contexts/AppContext'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, cloudError, cloudStatus, enableDemo, signIn, signUp } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error('Enter a valid email address.')
    if (password.length < 8) return toast.error('Password must be at least 8 characters.')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
        toast.success('Welcome back')
        navigate('/')
      } else {
        const result = await signUp(email.trim(), password)
        if (result.needsEmailConfirmation) {
          setConfirmationSent(true)
        } else {
          toast.success('Your workspace is ready')
          navigate('/')
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 dark:bg-zinc-950 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-slate-900/10 dark:shadow-black/50 sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.02fr_.98fr]">
        <section className="relative hidden overflow-hidden bg-zinc-950 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-25 subtle-grid" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <Logo className="relative z-10" />
          <div className="relative z-10 my-auto max-w-md py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs text-zinc-300"><Sparkles className="h-3.5 w-3.5 text-emerald-400" />Clarity for every cash movement</div>
            <h1 className="text-4xl font-semibold leading-[1.13] tracking-[-.04em]">Know exactly where your cash stands.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-400">A beautifully simple cash book with live balances, useful analytics, and accountant-ready exports.</p>

            <div className="mt-9 rounded-2xl border border-white/10 bg-white/[.055] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-zinc-400">Net cash balance</p><p className="mt-1 text-2xl font-semibold tabular">USh 62,013,000</p></div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">+18.4%</span>
              </div>
              <svg className="mt-4 h-24 w-full" viewBox="0 0 390 100" fill="none" role="img" aria-label="Cash balance trending upward">
                <defs><linearGradient id="auth-chart" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#34d399" stopOpacity=".28"/><stop offset="1" stopColor="#34d399" stopOpacity="0"/></linearGradient></defs>
                <path d="M0 82 C35 78 45 60 75 64 C112 69 120 49 150 54 C187 61 200 35 232 39 C268 44 278 25 310 30 C340 34 352 12 390 16 L390 100 L0 100Z" fill="url(#auth-chart)"/>
                <path d="M0 82 C35 78 45 60 75 64 C112 69 120 49 150 54 C187 61 200 35 232 39 C268 44 278 25 310 30 C340 34 352 12 390 16" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck className="h-4 w-4 text-emerald-500" />Protected by Supabase Row Level Security</div>
        </section>

        <section className="relative flex flex-col p-6 sm:p-10 lg:p-14">
          <div className="flex items-center justify-between lg:justify-end"><Logo className="lg:hidden" /><ThemeToggle /></div>
          <div className="mx-auto my-auto w-full max-w-sm py-10">
            {confirmationSent ? (
              <div className="animate-fade-up text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"><Mail className="h-6 w-6" /></span>
                <h2 className="mt-6 text-2xl font-bold tracking-tight">Check your inbox</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Open it to activate your account.</p>
                <Button variant="outline" className="mt-7 w-full" onClick={() => setConfirmationSent(false)}>Use a different email</Button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">{mode === 'login' ? <LockKeyhole className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}</div>
                  <h2 className="text-3xl font-bold tracking-[-.035em]">{mode === 'login' ? 'Welcome back' : 'Create your cash book'}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{mode === 'login' ? 'Sign in to continue to your private ledger.' : 'Start tracking cash clearly in just a moment.'}</p>
                </div>

                {cloudStatus === 'checking' && <div className="mb-5 rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Checking the Supabase database…</div>}
                {cloudError && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{cloudError}</span></div>}
                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 pl-10" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 px-10" /><button type="button" onClick={() => setShowPassword((show) => !show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  {mode === 'signup' && <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950"><Check className="h-3 w-3" /></span>Use 8+ characters for a secure account</div>}
                  <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>{submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Please wait…</> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight className="h-4 w-4" /></>}</Button>
                </form>

                <p className="mt-7 text-center text-sm text-muted-foreground">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <Link to={mode === 'login' ? '/signup' : '/login'} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">{mode === 'login' ? 'Create one' : 'Sign in'}</Link>
                </p>
                <button type="button" onClick={() => { enableDemo(); toast.success('Demo workspace opened') }} className="mt-4 w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-emerald-600 hover:underline">Explore the full demo without an account</button>
              </>
            )}
          </div>
          <p className="flex items-center justify-center gap-3 text-center text-[11px] text-muted-foreground"><span>Your ledger data remains isolated to your account.</span><Link to="/downloads" className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"><Download className="h-3 w-3" />Downloads</Link></p>
        </section>
      </div>
    </main>
  )
}
