import { useMemo, useState, type FormEvent } from 'react'
import { BriefcaseBusiness, CarFront, GraduationCap, Home, MoreHorizontal, Pencil, Plus, Trash2, UserRound, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { type AccountInput, useWorkspace } from '@/contexts/WorkspaceContext'
import type { CurrencyCode, MoneyAccount } from '@/types'

const iconMap = { Home, GraduationCap, BriefcaseBusiness, UserRound, CarFront, WalletCards }
const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#64748b']

export default function AccountsPage() {
  const { transactions } = useApp()
  const { accounts, createAccount, updateAccount, deleteAccount } = useWorkspace()
  const { formatMoney, transactionValue } = useCurrency()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MoneyAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MoneyAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AccountInput>({ name: '', description: '', icon: 'WalletCards', color: colors[0], budget_amount: null, budget_currency: 'UGX' })

  const spending = useMemo(() => new Map(accounts.map((account) => [account.id, transactions
    .filter((item) => item.account_id === account.id && item.type === 'credit')
    .reduce((sum, item) => sum + transactionValue(item, account.budget_currency), 0)])), [accounts, transactionValue, transactions])

  const showForm = (account?: MoneyAccount) => {
    setEditing(account || null)
    setForm(account ? { name: account.name, description: account.description, icon: account.icon, color: account.color, budget_amount: account.budget_amount, budget_currency: account.budget_currency } : { name: '', description: '', icon: 'WalletCards', color: colors[0], budget_amount: null, budget_currency: 'UGX' })
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return toast.error('Give this account a name.')
    setSaving(true)
    try {
      if (editing) await updateAccount(editing.id, { ...form, name: form.name.trim() })
      else await createAccount({ ...form, name: form.name.trim() })
      toast.success(editing ? 'Account updated' : 'Account created')
      setOpen(false)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save the account.') }
    finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try { await deleteAccount(deleteTarget.id); toast.success('Account removed'); setDeleteTarget(null) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not remove the account.') }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 animate-fade-up">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-muted-foreground">Organize money by purpose</p><h2 className="mt-1 text-2xl font-bold tracking-[-.035em] sm:text-3xl">Accounts & expense boxes</h2><p className="mt-1 text-sm text-muted-foreground">Keep Home, School, Business and personal spending separate.</p></div>
        <Button variant="primary" onClick={() => showForm()}><Plus className="h-4 w-4" />New account</Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.filter((account) => !account.archived).map((account) => {
          const Icon = iconMap[account.icon as keyof typeof iconMap] || WalletCards
          const spent = spending.get(account.id) || 0
          const budget = account.budget_amount || 0
          const percentage = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0
          return <Card key={account.id} className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg" style={{ backgroundColor: account.color }}><Icon className="h-5 w-5" /></span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => showForm(account)}><Pencil className="h-4 w-4" />Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => setDeleteTarget(account)} className="text-rose-600 focus:text-rose-600"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
              <button className="mt-5 w-full text-left" onClick={() => navigate(`/expenses?account=${account.id}`)}><h3 className="text-lg font-bold">{account.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{account.description || 'A dedicated space for your records.'}</p></button>
              <div className="mt-5 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</p><p className="mt-1 text-lg font-bold tabular">{formatMoney(spent, account.budget_currency)}</p></div><p className="text-xs text-muted-foreground">{budget ? `${percentage}% of budget` : 'No budget'}</p></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${percentage >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} /></div>
              {budget > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Budget {formatMoney(budget, account.budget_currency)}</p>}
            </CardContent>
          </Card>
        })}
        <button onClick={() => showForm()} className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-muted/10 p-6 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Plus className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold">Create another account</p><p className="mt-1 text-xs text-muted-foreground">Build a box for any money goal.</p></div></button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit account' : 'Create an account'}</DialogTitle><DialogDescription>Give this money box a clear purpose and optional monthly budget.</DialogDescription></DialogHeader><form id="account-form" onSubmit={submit} className="grid gap-4">
        <div className="space-y-2"><Label htmlFor="account-name">Name</Label><Input id="account-name" required placeholder="e.g. School" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="account-description">Description</Label><Input id="account-description" placeholder="What belongs in this account?" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Icon</Label><Select value={form.icon} onValueChange={(icon) => setForm({ ...form, icon })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(iconMap).map((icon) => <SelectItem key={icon} value={icon}>{icon.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Color</Label><div className="flex h-10 items-center gap-2">{colors.map((color) => <button type="button" key={color} aria-label={`Use ${color}`} onClick={() => setForm({ ...form, color })} className={`h-7 w-7 rounded-full transition ${form.color === color ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`} style={{ backgroundColor: color }} />)}</div></div></div>
        <div className="grid grid-cols-[1fr_110px] gap-3"><div className="space-y-2"><Label htmlFor="account-budget">Monthly budget</Label><Input id="account-budget" type="number" min="0" step="0.01" placeholder="Optional" value={form.budget_amount ?? ''} onChange={(event) => setForm({ ...form, budget_amount: event.target.value ? Number(event.target.value) : null })} /></div><div className="space-y-2"><Label>Currency</Label><Select value={form.budget_currency} onValueChange={(value) => setForm({ ...form, budget_currency: value as CurrencyCode })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(['UGX', 'USD', 'EUR', 'GBP', 'KES'] as CurrencyCode[]).map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent></Select></div></div>
      </form><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" form="account-form" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Delete “{deleteTarget?.name}”?</DialogTitle><DialogDescription>Expense records are kept, but they will no longer belong to this account.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete account</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
