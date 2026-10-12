import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, CircleDollarSign, FileText, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { CurrencyCode, Transaction, TransactionInput, TransactionType } from '@/types'
import { CATEGORIES } from '@/types'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null
}

const localDateTime = () => {
  const value = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  return value.toISOString().slice(0, 16)
}
const today = () => localDateTime().slice(0, 10)

export default function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  const { addTransaction, updateTransaction } = useApp()
  const { preferredCurrency, currencies, rateToUGX, formatMoney } = useCurrency()
  const { accounts } = useWorkspace()
  const [date, setDate] = useState(today())
  const [occurredAt, setOccurredAt] = useState(localDateTime())
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState('unassigned')
  const [type, setType] = useState<TransactionType>('debit')
  const [amount, setAmount] = useState('')
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>('UGX')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [category, setCategory] = useState<string>('Sales')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(transaction?.date || today())
    setOccurredAt(transaction?.occurred_at ? transaction.occurred_at.slice(0, 16) : localDateTime())
    setDescription(transaction?.description || '')
    setMerchant(transaction?.merchant || '')
    setNotes(transaction?.notes || '')
    setAccountId(transaction?.account_id || accounts[0]?.id || 'unassigned')
    setType(transaction?.type || 'debit')
    setAmount(transaction ? String(transaction.amount) : '')
    setCurrencyCode(transaction?.currency_code || preferredCurrency)
    setExchangeRate(transaction?.exchange_rate_to_ugx || rateToUGX(preferredCurrency))
    setCategory(transaction?.category || 'Sales')
  }, [accounts, open, preferredCurrency, rateToUGX, transaction])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!description.trim()) return toast.error('Add a clear narration for this entry.')
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return toast.error('Amount must be greater than zero.')
    if (Math.round(numericAmount * 100) !== numericAmount * 100) return toast.error('Use no more than two decimal places.')
    if (currencyCode !== 'UGX' && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) return toast.error('Enter a valid UGX exchange rate.')

    const input: TransactionInput = {
      date,
      occurred_at: new Date(occurredAt).toISOString(),
      description: description.trim(),
      merchant: merchant.trim() || null,
      notes: notes.trim() || null,
      account_id: accountId === 'unassigned' ? null : accountId,
      type,
      amount: numericAmount,
      currency_code: currencyCode,
      exchange_rate_to_ugx: currencyCode === 'UGX' ? 1 : exchangeRate,
      category,
    }
    setSaving(true)
    try {
      if (transaction) {
        await updateTransaction(transaction.id, input)
        toast.success('Transaction updated')
      } else {
        await addTransaction(input)
        toast.success(`${type === 'debit' ? 'Receipt' : 'Payment'} recorded`)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save transaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <div className={`mb-1 grid h-10 w-10 place-items-center rounded-xl ${transaction?.type === 'credit' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
            {transaction?.type === 'credit' ? <ArrowUpFromLine className="h-[18px] w-[18px]" /> : <ArrowDownToLine className="h-[18px] w-[18px]" />}
          </div>
          <DialogTitle>{transaction ? 'Edit transaction' : 'Record transaction'}</DialogTitle>
          <DialogDescription>{transaction ? 'Update this ledger entry. Your totals will recalculate instantly.' : 'Add a receipt or payment to your cash ledger.'}</DialogDescription>
        </DialogHeader>

        <form id="transaction-form" onSubmit={submit} className="mt-2 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="tx-type">Entry type</Label>
            <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
              <SelectTrigger id="tx-type" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debit"><span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400"><ArrowDownToLine className="h-4 w-4" />Debit · Cash receipt</span></SelectItem>
                <SelectItem value="credit"><span className="flex items-center gap-2 font-medium text-rose-600 dark:text-rose-400"><ArrowUpFromLine className="h-4 w-4" />Credit · Cash payment</span></SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Debit is cash in. Credit is cash out.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tx-date">Date & time</Label>
              <div className="relative"><CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="tx-date" required type="datetime-local" value={occurredAt} onChange={(event) => { setOccurredAt(event.target.value); setDate(event.target.value.slice(0, 10)) }} className="h-11 pl-10" /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-currency">Entry currency</Label>
              <Select value={currencyCode} onValueChange={(value) => { const code = value as CurrencyCode; setCurrencyCode(code); setExchangeRate(rateToUGX(code)) }}>
                <SelectTrigger id="tx-currency" className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.code} · {currency.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-account">Account / expense box</Label>
            <Select value={accountId} onValueChange={setAccountId}><SelectTrigger id="tx-account" className="h-11"><SelectValue placeholder="Choose an account" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{accounts.filter((account) => !account.archived).map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${currencyCode === 'UGX' ? '' : 'sm:grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount ({currencyCode})</Label>
              <div className="relative"><CircleDollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="tx-amount" required type="number" inputMode="decimal" min={currencyCode === 'UGX' ? '1' : '0.01'} max="999999999999.99" step={currencyCode === 'UGX' ? '1' : '0.01'} placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 pl-10 tabular" /></div>
            </div>
            {currencyCode !== 'UGX' && <div className="space-y-2">
              <Label htmlFor="tx-rate">UGX exchange rate</Label>
              <Input id="tx-rate" required type="number" inputMode="decimal" min="0.00000001" step="0.00000001" value={exchangeRate} onChange={(event) => setExchangeRate(Number(event.target.value))} className="h-11 tabular" />
              <p className="text-[10px] text-muted-foreground">1 {currencyCode} = {formatMoney(exchangeRate, 'UGX')} · saved with this entry</p>
            </div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description">What was purchased / narration</Label>
            <div className="relative"><FileText className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input id="tx-description" required maxLength={180} placeholder="e.g. Mathematics textbooks" value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 pl-10" /></div>
          </div>

          <div className="space-y-2"><Label htmlFor="tx-merchant">Where was it spent?</Label><Input id="tx-merchant" maxLength={120} placeholder="e.g. Aristoc Booklex, Kampala" value={merchant} onChange={(event) => setMerchant(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="tx-notes">Optional notes</Label><textarea id="tx-notes" maxLength={500} rows={2} placeholder="Receipt number, purpose, or other detail" value={notes} onChange={(event) => setNotes(event.target.value)} className="flex w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15" /></div>

          <div className="space-y-2">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="tx-category" className="h-11"><span className="flex min-w-0 items-center gap-2"><Tag className="h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue /></span></SelectTrigger>
              <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="transaction-form" variant="primary" disabled={saving}>{saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Saving…</> : transaction ? 'Save changes' : 'Record entry'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
