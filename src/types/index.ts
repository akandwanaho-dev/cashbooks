export type TransactionType = 'debit' | 'credit'
export type CurrencyCode = 'UGX' | 'USD' | 'EUR' | 'GBP' | 'KES' | 'TZS' | 'RWF' | 'ZAR'

export interface Transaction {
  id: string
  user_id: string
  date: string
  occurred_at: string
  description: string
  merchant: string | null
  notes: string | null
  account_id: string | null
  type: TransactionType
  /** Amount in the currency used when the entry was recorded. */
  amount: number
  /** ISO 4217 code anchored to this historical entry. */
  currency_code: CurrencyCode
  /** Units of UGX for one unit of currency_code at entry time. */
  exchange_rate_to_ugx: number
  category: string
  created_at: string
  updated_at: string
}

export type TransactionInput = Pick<
  Transaction,
  'date' | 'occurred_at' | 'description' | 'merchant' | 'notes' | 'account_id' | 'type' | 'amount' | 'currency_code' | 'exchange_rate_to_ugx' | 'category'
>

export interface MoneyAccount {
  id: string
  user_id: string
  name: string
  description: string | null
  icon: string
  color: string
  budget_amount: number | null
  budget_currency: CurrencyCode
  archived: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  username: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  bio: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface MoneyQuote {
  id: string
  text: string
  author: string | null
  category: string
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  user_id: string
  daily_reminder_enabled: boolean
  daily_reminder_time: string
  quotes_enabled: boolean
  expense_reminders_enabled: boolean
  debt_reminders_enabled: boolean
  push_enabled: boolean
  updated_at: string
}

export interface Liability {
  id: string
  user_id: string
  name: string
  kind: 'loan' | 'debt'
  amount: number
  currency_code: CurrencyCode
  exchange_rate_to_ugx: number
  due_date: string
  recurrence: 'none' | 'monthly'
  reminder_days_before: number
  reminder_time: string
  status: 'open' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface AppUser {
  id: string
  email: string
}

export type AppConfig =
  | { mode: 'supabase'; url: string; anonKey: string; source: 'environment' | 'browser' }
  | { mode: 'demo'; source: 'browser' }

export interface LedgerFilters {
  search: string
  period: string
  accountId?: string
}

export const CATEGORIES = ['Food', 'Education', 'Housing', 'Transport', 'Health', 'Entertainment', 'Sales', 'Rent', 'Utilities', 'Salaries', 'Logistics', 'Supplies', 'Tax', 'Loan', 'Debt', 'Other'] as const
