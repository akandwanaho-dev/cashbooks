import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowDownUp, ArrowLeft, ArrowRight, ArrowUp, BookOpenText, CalendarRange, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import ExportButton from '@/components/ExportButton'
import TransactionDialog from '@/components/TransactionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/contexts/AppContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { fromCents, toCents } from '@/lib/decimal'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

function SortableHeader({ label, sorted, onClick, align = 'left' }: { label: string; sorted: false | 'asc' | 'desc'; onClick: () => void; align?: 'left' | 'right' }) {
  return <button onClick={onClick} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground hover:text-foreground', align === 'right' && 'float-right')}>{label}{sorted === 'asc' ? <ArrowUp className="h-3 w-3" /> : sorted === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowDownUp className="h-3 w-3 opacity-40" />}</button>
}

export default function LedgerTable() {
  const { transactions, transactionsLoading, deleteTransaction } = useApp()
  const { preferredCurrency, transactionValue, formatMoney, formatTransaction } = useCurrency()
  const { accounts } = useWorkspace()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [accountId, setAccountId] = useState(searchParams.get('account') || 'all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const periodOptions = useMemo(() => {
    const values = new Set<string>()
    transactions.forEach((item) => {
      values.add(item.date.slice(0, 4))
      values.add(item.date.slice(0, 7))
    })
    return Array.from(values).sort().reverse().map((value) => ({
      value,
      label: value.length === 4 ? value : format(parseISO(`${value}-01`), 'MMMM yyyy'),
    }))
  }, [transactions])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return transactions.filter((item) => {
      const matchesSearch = !query || item.description.toLocaleLowerCase().includes(query) || item.category.toLocaleLowerCase().includes(query) || item.merchant?.toLocaleLowerCase().includes(query) || item.notes?.toLocaleLowerCase().includes(query)
      const matchesPeriod = period === 'all' || item.date.startsWith(period)
      const matchesAccount = accountId === 'all' || item.account_id === accountId
      return matchesSearch && matchesPeriod && matchesAccount
    })
  }, [accountId, transactions, search, period])

  const balanceById = useMemo(() => {
    let cents = 0
    const map = new Map<string, number>()
    filtered.slice().sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)).forEach((item) => {
      const displayAmount = transactionValue(item)
      cents += item.type === 'debit' ? toCents(displayAmount) : -toCents(displayAmount)
      map.set(item.id, fromCents(cents))
    })
    return map
  }, [filtered, transactionValue])

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'date',
      header: ({ column }) => <SortableHeader label="Date" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <div className="whitespace-nowrap"><p className="text-sm font-medium">{format(parseISO(row.original.date), 'dd MMM yyyy')}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{format(new Date(row.original.occurred_at), 'h:mm a')}</p></div>,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <SortableHeader label="Narration" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <div className="max-w-[300px]"><p className="truncate text-sm font-medium" title={row.original.description}>{row.original.description}</p><p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-muted-foreground">{row.original.merchant ? `${row.original.merchant} · ` : ''}Ref {row.original.id.slice(0, 7)} · {formatMoney(row.original.amount, row.original.currency_code)} original</p></div>,
    },
    {
      accessorKey: 'category',
      header: ({ column }) => <SortableHeader label="Account / category" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <div><p className="text-xs font-semibold">{accounts.find((account) => account.id === row.original.account_id)?.name || 'Unassigned'}</p><Badge variant="secondary" className="mt-1 font-medium">{row.original.category}</Badge></div>,
    },
    {
      id: 'debit',
      accessorFn: (row) => row.type === 'debit' ? transactionValue(row) : -1,
      header: ({ column }) => <SortableHeader label="Debit" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} align="right" />,
      cell: ({ row }) => <div className="min-w-[110px] text-right font-semibold tabular text-emerald-600 dark:text-emerald-400">{row.original.type === 'debit' ? formatTransaction(row.original) : <span className="font-normal text-muted-foreground/50">—</span>}</div>,
    },
    {
      id: 'credit',
      accessorFn: (row) => row.type === 'credit' ? transactionValue(row) : -1,
      header: ({ column }) => <SortableHeader label="Credit" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} align="right" />,
      cell: ({ row }) => <div className="min-w-[110px] text-right font-semibold tabular text-rose-600 dark:text-rose-400">{row.original.type === 'credit' ? formatTransaction(row.original) : <span className="font-normal text-muted-foreground/50">—</span>}</div>,
    },
    {
      id: 'balance',
      accessorFn: (row) => balanceById.get(row.id) || 0,
      header: ({ column }) => <SortableHeader label="Balance" sorted={column.getIsSorted()} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} align="right" />,
      cell: ({ row }) => { const value = balanceById.get(row.original.id) || 0; return <div className={cn('min-w-[120px] text-right font-bold tabular', value < 0 && 'text-amber-600 dark:text-amber-400')}>{formatMoney(value)}</div> },
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Transaction actions</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem onSelect={() => setEditing(row.original)}><Pencil className="h-4 w-4" />Edit entry</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDeleteTarget(row.original)} className="text-rose-600 focus:text-rose-600"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [accounts, balanceById, formatMoney, formatTransaction, transactionValue])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  })

  useEffect(() => { table.setPageIndex(0) }, [accountId, period, search, table])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaction deleted')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete transaction.')
    } finally {
      setDeleting(false)
    }
  }

  const selectedPeriodLabel = period === 'all' ? 'All periods' : periodOptions.find((item) => item.value === period)?.label || period
  const firstRow = filtered.length ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0
  const lastRow = Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filtered.length)

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="relative flex-1 sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search ledger" placeholder="Search narration or category…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" /></div>
            <div className="flex flex-wrap gap-2">
              <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="min-w-0 flex-1 sm:w-[160px] sm:flex-none"><SelectValue placeholder="All accounts" /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="min-w-0 flex-1 sm:w-[180px] sm:flex-none"><span className="flex min-w-0 items-center gap-2"><CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue /></span></SelectTrigger>
                <SelectContent><SelectItem value="all">All periods</SelectItem>{periodOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              <ExportButton transactions={filtered} periodLabel={`${selectedPeriodLabel} · ${accountId === 'all' ? 'All accounts' : accounts.find((account) => account.id === accountId)?.name || 'Account'}`} currencyCode={preferredCurrency} getDisplayAmount={transactionValue} />
            </div>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse">
              <thead><tr className="border-b bg-muted/35">{table.getHeaderGroups()[0].headers.map((header) => <th key={header.id} className="px-4 py-3.5 text-left first:pl-5 last:pr-5">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr></thead>
              <tbody>
                {transactionsLoading ? Array.from({ length: 6 }, (_, index) => <tr key={index} className="border-b"><td colSpan={7} className="px-5 py-3"><Skeleton className="h-10 w-full" /></td></tr>) : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="group border-b transition-colors last:border-0 hover:bg-muted/30">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3.5 first:pl-5 last:pr-5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>
                )) : (
                  <tr><td colSpan={7}><div className="grid h-72 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><BookOpenText className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold">{search || period !== 'all' || accountId !== 'all' ? 'No matching entries' : 'Your ledger is empty'}</p><p className="mt-1 text-xs text-muted-foreground">{search || period !== 'all' || accountId !== 'all' ? 'Try clearing your search, account, or period filter.' : 'Record your first receipt or payment to begin.'}</p>{(search || period !== 'all' || accountId !== 'all') && <Button variant="link" size="sm" className="mt-2" onClick={() => { setSearch(''); setPeriod('all'); setAccountId('all') }}>Clear filters</Button>}</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted-foreground">Showing <strong className="text-foreground">{firstRow}–{lastRow}</strong> of <strong className="text-foreground">{filtered.length}</strong> entries</p>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">Rows
                <Select value={String(table.getState().pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}><SelectTrigger className="h-8 w-[68px]"><SelectValue /></SelectTrigger><SelectContent>{[8, 15, 30].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} aria-label="First page"><ArrowLeft className="h-3.5 w-3.5" /></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="min-w-14 text-center text-xs font-medium">{table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label="Last page"><ArrowRight className="h-3.5 w-3.5" /></Button></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TransactionDialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} transaction={editing} />
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"><Trash2 className="h-[18px] w-[18px]" /></span><DialogTitle>Delete this entry?</DialogTitle><DialogDescription>This permanently removes “{deleteTarget?.description}” from your ledger. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter className="mt-3"><Button variant="outline" onClick={() => setDeleteTarget(null)}>Keep entry</Button><Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete entry'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
