import { ArrowDownLeft, ArrowUpRight, BookOpenCheck } from 'lucide-react'
import LedgerTable from '@/components/LedgerTable'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { fromCents, toCents } from '@/lib/decimal'

export default function Ledger() {
  const { transactions } = useApp()
  const { preferredCurrency, transactionValue, formatMoney } = useCurrency()
  const receipts = fromCents(transactions.filter((item) => item.type === 'debit').reduce((sum, item) => sum + toCents(transactionValue(item)), 0))
  const payments = fromCents(transactions.filter((item) => item.type === 'credit').reduce((sum, item) => sum + toCents(transactionValue(item)), 0))

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 animate-fade-up">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Badge variant="outline" className="bg-card"><BookOpenCheck className="h-3.5 w-3.5 text-emerald-500" />Double-entry view</Badge></div>
          <h2 className="mt-3 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Cash ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">Debits are receipts in. Credits are payments out. Totals display in {preferredCurrency}.</p>
        </div>
        <div className="flex divide-x overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5"><ArrowDownLeft className="h-4 w-4 text-emerald-500" /><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receipts</p><p className="text-sm font-bold tabular text-emerald-600 dark:text-emerald-400">{formatMoney(receipts)}</p></div></div>
          <div className="flex items-center gap-2 px-4 py-2.5"><ArrowUpRight className="h-4 w-4 text-rose-500" /><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Payments</p><p className="text-sm font-bold tabular text-rose-600 dark:text-rose-400">{formatMoney(payments)}</p></div></div>
        </div>
      </section>
      <LedgerTable />
    </div>
  )
}
