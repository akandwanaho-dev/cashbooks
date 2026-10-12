import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import type { SheetData } from 'write-excel-file/browser'
import { Button } from '@/components/ui/button'
import { fromCents, toCents } from '@/lib/decimal'
import type { CurrencyCode, Transaction } from '@/types'

const headerCell = (value: string) => ({
  value,
  fontWeight: 'bold' as const,
  backgroundColor: '#064E3B',
  textColor: '#FFFFFF',
  align: 'center' as const,
  alignVertical: 'center' as const,
  borderColor: '#D1FAE5',
  borderStyle: 'thin' as const,
})

const moneyCell = (value: number | null, emphasis = false) => value === null ? null : ({
  value,
  type: Number,
  format: '#,##0.00;[Red]-#,##0.00',
  align: 'right' as const,
  fontWeight: emphasis ? 'bold' as const : undefined,
  borderColor: '#E5E7EB',
  borderStyle: 'thin' as const,
})

export default function ExportButton({
  transactions,
  periodLabel = 'All periods',
  currencyCode,
  getDisplayAmount,
}: {
  transactions: Transaction[]
  periodLabel?: string
  currencyCode: CurrencyCode
  getDisplayAmount: (transaction: Transaction) => number
}) {
  const [exporting, setExporting] = useState(false)

  const exportWorkbook = async () => {
    if (!transactions.length) return toast.error('There are no filtered transactions to export.')
    setExporting(true)
    try {
      // Dynamic loading keeps the spreadsheet writer out of the initial UI bundle.
      const { default: writeXlsxFile } = await import('write-excel-file/browser')
      let runningCents = 0
      const sorted = transactions.slice().sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
      const dataRows: SheetData = sorted.map((item) => {
        const displayAmount = getDisplayAmount(item)
        const cents = toCents(displayAmount)
        runningCents += item.type === 'debit' ? cents : -cents
        const rateNote = item.currency_code === currencyCode ? '' : ` [Original: ${item.currency_code} ${item.amount} @ ${item.exchange_rate_to_ugx} UGX]`
        return [
          { value: new Date(`${item.date}T00:00:00`), type: Date, format: 'dd mmm yyyy', borderColor: '#E5E7EB', borderStyle: 'thin' },
          { value: `${item.description}${rateNote}`, type: String, wrap: true, borderColor: '#E5E7EB', borderStyle: 'thin' },
          moneyCell(item.type === 'debit' ? displayAmount : null),
          moneyCell(item.type === 'credit' ? displayAmount : null),
          moneyCell(fromCents(runningCents)),
        ]
      })

      const totalDebits = fromCents(sorted.filter((item) => item.type === 'debit').reduce((sum, item) => sum + toCents(getDisplayAmount(item)), 0))
      const totalCredits = fromCents(sorted.filter((item) => item.type === 'credit').reduce((sum, item) => sum + toCents(getDisplayAmount(item)), 0))
      const sheetData: SheetData = [
        [{ value: 'CASHBOOK LEDGER', columnSpan: 5, fontSize: 18, fontWeight: 'bold', textColor: '#064E3B', align: 'center' }, null, null, null, null],
        [{ value: `Period: ${periodLabel} · Display currency: ${currencyCode}`, columnSpan: 5, textColor: '#64748B', align: 'center' }, null, null, null, null],
        [{ value: `Exported: ${new Date().toLocaleString()}`, columnSpan: 5, textColor: '#64748B', align: 'center' }, null, null, null, null],
        [null, null, null, null, null],
        ['Date', 'Narration', `Debit (${currencyCode})`, `Credit (${currencyCode})`, `Running Balance (${currencyCode})`].map(headerCell),
        ...dataRows,
        [null, null, null, null, null],
        [null, { value: 'TOTALS', fontWeight: 'bold', align: 'right' }, moneyCell(totalDebits, true), moneyCell(totalCredits, true), moneyCell(fromCents(runningCents), true)],
      ]

      const stamp = new Date().toISOString().slice(0, 10)
      await writeXlsxFile(sheetData, {
        sheet: 'Cash Ledger',
        columns: [{ width: 15 }, { width: 42 }, { width: 20 }, { width: 20 }, { width: 20 }],
        stickyRowsCount: 5,
        showGridLines: false,
      }).toFile(`cashbook-ledger-${stamp}.xlsx`)
      toast.success(`Exported ${transactions.length} ledger entries`)
    } catch {
      toast.error('The Excel export could not be created.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={exportWorkbook} disabled={exporting || !transactions.length}>
      {exporting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Download className="h-4 w-4" />}
      <span className="hidden sm:inline">Export Excel</span>
    </Button>
  )
}
