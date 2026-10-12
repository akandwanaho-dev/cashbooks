import { format, subDays } from 'date-fns'
import type { CurrencyCode, Transaction, TransactionType } from '@/types'

const today = new Date()
const d = (daysAgo: number) => format(subDays(today, daysAgo), 'yyyy-MM-dd')

function transaction(
  id: string,
  daysAgo: number,
  description: string,
  type: TransactionType,
  amount: number,
  category: string,
  currency_code: CurrencyCode = 'UGX',
  exchange_rate_to_ugx = 1,
): Transaction {
  const timestamp = new Date().toISOString()
  const date = d(daysAgo)
  const account_id = category === 'Sales' || category === 'Logistics' ? 'account-business' : category === 'Rent' || category === 'Utilities' ? 'account-home' : category === 'Supplies' ? 'account-school' : 'account-personal'
  return {
    id,
    user_id: 'demo-user',
    date,
    occurred_at: `${date}T12:00:00`,
    description,
    merchant: category === 'Sales' ? 'Customer receipts' : 'Local supplier',
    notes: null,
    account_id,
    type,
    amount,
    category,
    currency_code,
    exchange_rate_to_ugx,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

export const seedTransactions: Transaction[] = [
  transaction('demo-01', 34, 'Opening cash balance', 'debit', 31_450_000, 'Sales'),
  transaction('demo-02', 30, 'Warehouse monthly rent', 'credit', 6_475_000, 'Rent'),
  transaction('demo-03', 26, 'Retail counter sales', 'debit', 15_837_850, 'Sales'),
  transaction('demo-04', 22, 'Electricity and internet', 'credit', 1_786_175, 'Utilities'),
  transaction('demo-05', 17, 'Client invoice CB-1042', 'debit', 1_680, 'Sales', 'USD', 3_700),
  transaction('demo-06', 14, 'Monthly payroll', 'credit', 14_615_000, 'Salaries'),
  transaction('demo-07', 10, 'Delivery fleet fuel', 'credit', 2_684_000, 'Logistics'),
  transaction('demo-08', 6, 'Weekend counter receipts', 'debit', 11_618_925, 'Sales'),
  transaction('demo-09', 3, 'Packaging supplies', 'credit', 2_265_695, 'Supplies'),
  transaction('demo-10', 0, 'Online order receipts', 'debit', 6_882_000, 'Sales'),
]
