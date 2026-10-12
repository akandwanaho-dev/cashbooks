import { useMemo } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Banknote, CircleAlert, Ellipsis, Quote, ReceiptText, TrendingUp, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { fromCents, toCents } from '@/lib/decimal'
import type { Transaction } from '@/types'

const PIE_COLORS = ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c', '#881337', '#fecdd3']

function KpiCard({ title, value, kind, helper, icon: Icon, loading, formatValue }: {
  title: string
  value: number
  kind: 'receipt' | 'payment' | 'balance'
  helper: string
  icon: typeof Banknote
  loading: boolean
  formatValue: (value: number) => string
}) {
  const isNegative = kind === 'balance' && value < 0
  const styles = kind === 'receipt'
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
    : kind === 'payment'
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
      : isNegative ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'
  return (
    <Card className="group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${styles}`}><Icon className="h-[19px] w-[19px]" /></div>
          {kind === 'balance' && isNegative ? <Badge variant="danger"><CircleAlert className="h-3 w-3" />Negative</Badge> : <button className="rounded-lg p-1 text-muted-foreground opacity-40 hover:bg-muted hover:opacity-100" aria-label={`${title} options`}><Ellipsis className="h-4 w-4" /></button>}
        </div>
        <p className="mt-5 text-xs font-medium text-muted-foreground">{title}</p>
        {loading ? <Skeleton className="mt-2 h-9 w-36" /> : <p className={`mt-1 text-[28px] font-bold tracking-[-.04em] tabular sm:text-3xl ${kind === 'receipt' ? 'text-emerald-600 dark:text-emerald-400' : kind === 'payment' ? 'text-rose-600 dark:text-rose-400' : isNegative ? 'text-amber-600 dark:text-amber-400' : ''}`}>{formatValue(value)}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload, label, formatValue }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; formatValue: (value: number) => string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border bg-popover px-3 py-2 shadow-xl"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold tabular">{formatValue(payload[0].value)}</p></div>
}

function buildTrend(transactions: Transaction[], transactionValue: (transaction: Transaction) => number) {
  const grouped = new Map<string, number>()
  transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .forEach((transaction) => {
      const displayAmount = transactionValue(transaction)
      const movement = transaction.type === 'debit' ? toCents(displayAmount) : -toCents(displayAmount)
      grouped.set(transaction.date, (grouped.get(transaction.date) || 0) + movement)
    })
  let balance = 0
  return Array.from(grouped.entries()).map(([date, movement]) => {
    balance += movement
    return { date: format(parseISO(date), 'MMM d'), balance: fromCents(balance) }
  })
}

export default function Dashboard() {
  const { transactions, transactionsLoading, user, isDemo } = useApp()
  const { preferredCurrency, transactionValue, formatMoney, formatTransaction } = useCurrency()
  const { quotes } = useWorkspace()
  const dailyQuote = quotes.filter((quote) => quote.active)[new Date().getDate() % Math.max(quotes.filter((quote) => quote.active).length, 1)]
  const analytics = useMemo(() => {
    const debitCents = transactions.filter((item) => item.type === 'debit').reduce((sum, item) => sum + toCents(transactionValue(item)), 0)
    const creditCents = transactions.filter((item) => item.type === 'credit').reduce((sum, item) => sum + toCents(transactionValue(item)), 0)
    const categories = new Map<string, number>()
    transactions.filter((item) => item.type === 'credit').forEach((item) => categories.set(item.category, (categories.get(item.category) || 0) + toCents(transactionValue(item))))
    return {
      receipts: fromCents(debitCents),
      payments: fromCents(creditCents),
      balance: fromCents(debitCents - creditCents),
      trend: buildTrend(transactions, transactionValue),
      expenseCategories: Array.from(categories.entries()).map(([name, cents]) => ({ name, value: fromCents(cents) })).sort((a, b) => b.value - a.value),
    }
  }, [transactions, transactionValue])

  const recent = transactions.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const displayName = isDemo ? 'Alex' : (user?.email.split('@')[0].split(/[._-]/)[0] || 'there')

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 animate-fade-up">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'MMMM yyyy')} overview</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <span className="capitalize">{displayName}</span>.</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>Balances are up to date</div>
      </section>

      {dailyQuote && <section className="flex items-start gap-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-emerald-950 dark:text-emerald-400"><Quote className="h-[18px] w-[18px]" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Today’s money motivation</p><p className="mt-1 text-sm font-medium leading-6">“{dailyQuote.text}” <span className="text-muted-foreground">— {dailyQuote.author || 'Cashbook'}</span></p></div></section>}

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Receipts (Debit)" value={analytics.receipts} kind="receipt" helper={`${transactions.filter((item) => item.type === 'debit').length} incoming cash entries`} icon={ArrowDownLeft} loading={transactionsLoading} formatValue={formatMoney} />
        <KpiCard title="Total Payments (Credit)" value={analytics.payments} kind="payment" helper={`${transactions.filter((item) => item.type === 'credit').length} outgoing cash entries`} icon={ArrowUpRight} loading={transactionsLoading} formatValue={formatMoney} />
        <KpiCard title="Net Cash Balance" value={analytics.balance} kind="balance" helper="Receipts less total payments" icon={WalletCards} loading={transactionsLoading} formatValue={formatMoney} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle>Cash balance runway</CardTitle><CardDescription className="mt-1.5">Rolling net balance across your ledger</CardDescription></div>
            <Badge variant="success"><TrendingUp className="h-3 w-3" />Live</Badge>
          </CardHeader>
          <CardContent>
            {analytics.trend.length ? (
              <div className="h-[285px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trend} margin={{ top: 10, right: 2, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.28}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-zinc-800" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} dy={10} minTickGap={28} />
                    <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(value) => `${preferredCurrency} ${Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(0)}m` : Math.abs(value) >= 1_000 ? `${(value / 1_000).toFixed(0)}k` : value}`} />
                    <Tooltip content={<ChartTooltip formatValue={formatMoney} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2.5} fill="url(#balanceGradient)" activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payments by category</CardTitle><CardDescription>Where outgoing cash is being spent</CardDescription></CardHeader>
          <CardContent>
            {analytics.expenseCategories.length ? (
              <>
                <div className="relative mx-auto h-[190px] max-w-xs">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={80} paddingAngle={3} strokeWidth={0}>{analytics.expenseCategories.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 }} /></PieChart></ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[10px] text-muted-foreground">Total paid</p><p className="mt-0.5 text-lg font-bold tabular">{formatMoney(analytics.payments)}</p></div></div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                  {analytics.expenseCategories.slice(0, 6).map((category, index) => <div key={category.name} className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} /><span className="truncate text-xs text-muted-foreground">{category.name}</span><span className="ml-auto text-xs font-semibold tabular">{analytics.payments ? Math.round(category.value / analytics.payments * 100) : 0}%</span></div>)}
                </div>
              </>
            ) : <EmptyChart compact />}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle>Recent activity</CardTitle><CardDescription className="mt-1.5">Your latest cash movements</CardDescription></div>
          <Button variant="ghost" size="sm" asChild><Link to="/expenses">View expenses <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardHeader>
        <CardContent className="px-0 pb-1 sm:px-0">
          {recent.length ? <div className="divide-y">{recent.map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-muted/40 sm:px-6">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${transaction.type === 'debit' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>{transaction.type === 'debit' ? <ArrowDownLeft className="h-[18px] w-[18px]" /> : <ArrowUpRight className="h-[18px] w-[18px]" />}</span>
              <div className="min-w-0"><p className="truncate text-sm font-medium">{transaction.description}</p><p className="mt-0.5 text-xs text-muted-foreground">{format(parseISO(transaction.date), 'MMM d, yyyy')} · {transaction.category}{transaction.currency_code !== preferredCurrency ? ` · ${formatMoney(transaction.amount, transaction.currency_code)} original` : ''}</p></div>
              <div className={`ml-auto text-right text-sm font-bold tabular ${transaction.type === 'debit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{transaction.type === 'debit' ? '+' : '−'}{formatTransaction(transaction)}<p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{transaction.type === 'debit' ? 'Receipt' : 'Payment'}</p></div>
            </div>
          ))}</div> : <div className="px-6 pb-7"><EmptyChart compact /></div>}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyChart({ compact = false }: { compact?: boolean }) {
  return <div className={`grid place-items-center rounded-xl border border-dashed bg-muted/20 text-center ${compact ? 'h-48' : 'h-[285px]'}`}><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground"><ReceiptText className="h-[18px] w-[18px]" /></span><p className="mt-3 text-sm font-medium">No transactions yet</p><p className="mt-1 text-xs text-muted-foreground">Record an entry to see your analytics.</p></div></div>
}
