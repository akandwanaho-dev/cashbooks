import { Activity, BellRing, Database, Quote, ShieldCheck, Users, WalletCards } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/contexts/AppContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export default function AdminOverview() {
  const { transactions, isOnline, isDemo } = useApp()
  const { accounts, quotes } = useWorkspace()
  const stats = [
    { label: 'Active accounts', value: accounts.filter((item) => !item.archived).length, icon: WalletCards, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Expense records', value: transactions.length, icon: Activity, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40' },
    { label: 'Active quotes', value: quotes.filter((item) => item.active).length, icon: Quote, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40' },
    { label: 'System mode', value: isDemo ? 'Demo' : isOnline ? 'Live' : 'Offline', icon: Database, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  ]
  return <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-up"><section><p className="text-sm text-muted-foreground">Secure administration workspace</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">System overview</h2></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, color }) => <Card key={label}><CardContent className="p-5"><span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Icon className="h-[18px] w-[18px]" /></span><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</section><section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Administration capabilities</CardTitle><CardDescription>Configuration areas protected by the admin role.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{[{ icon: Users, text: 'User and role management' }, { icon: Quote, text: 'Motivational quote library' }, { icon: BellRing, text: 'Notification defaults' }, { icon: ShieldCheck, text: 'Pages, themes and errors' }].map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-3 rounded-xl border p-3"><Icon className="h-4 w-4 text-emerald-500" /><span className="text-xs font-medium">{text}</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Security status</CardTitle><CardDescription>Client and database protection summary.</CardDescription></CardHeader><CardContent className="space-y-3">{['Row Level Security enabled', 'Admin role checked server-side', 'No service-role key in clients', 'Per-user finance data isolation'].map((item) => <div key={item} className="flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950"><ShieldCheck className="h-3.5 w-3.5" /></span>{item}</div>)}</CardContent></Card></section></div>
}
