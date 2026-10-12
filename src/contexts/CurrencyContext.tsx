import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Preferences } from '@capacitor/preferences'
import type { CurrencyCode, Transaction } from '@/types'

const CURRENCY_PREFERENCE_KEY = 'cashbook.currency.preference.v1'
const CURRENCY_RATES_KEY = 'cashbook.currency.rates.v1'

export interface CurrencyDefinition {
  code: CurrencyCode
  name: string
  symbol: string
  locale: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', locale: 'en-UG' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', locale: 'en-TZ' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF', locale: 'en-RW' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
]

/**
 * Offline fallback reference rates. These are deliberately not presented as live
 * rates. Production rate updates should come from a trusted server/Edge Function.
 * Every transaction captures its exact rate, so later updates never rewrite history.
 */
const DEFAULT_RATES_TO_UGX: Record<CurrencyCode, number> = {
  UGX: 1,
  USD: 3700,
  EUR: 4300,
  GBP: 5050,
  KES: 28.5,
  TZS: 1.42,
  RWF: 2.58,
  ZAR: 205,
}

interface StoredRates {
  rates: Record<CurrencyCode, number>
  updatedAt: string
}

interface CurrencyContextValue {
  preferredCurrency: CurrencyCode
  currencies: CurrencyDefinition[]
  ratesToUGX: Record<CurrencyCode, number>
  ratesUpdatedAt: string
  setPreferredCurrency: (code: CurrencyCode) => Promise<void>
  updateRates: (rates: Partial<Record<CurrencyCode, number>>, updatedAt?: string) => Promise<void>
  rateToUGX: (code: CurrencyCode) => number
  convert: (amount: number, from: CurrencyCode, to?: CurrencyCode, historicalRateToUGX?: number) => number
  transactionValue: (transaction: Transaction, to?: CurrencyCode) => number
  formatMoney: (amount: number, code?: CurrencyCode) => string
  formatTransaction: (transaction: Transaction, to?: CurrencyCode) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)
const isCurrencyCode = (value: string): value is CurrencyCode => SUPPORTED_CURRENCIES.some((currency) => currency.code === value)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCurrency, setPreferredCurrencyState] = useState<CurrencyCode>('UGX')
  const [ratesToUGX, setRatesToUGX] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_TO_UGX)
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState('Offline reference rates')

  useEffect(() => {
    let active = true
    Promise.all([
      Preferences.get({ key: CURRENCY_PREFERENCE_KEY }),
      Preferences.get({ key: CURRENCY_RATES_KEY }),
    ]).then(([currencyResult, ratesResult]) => {
      if (!active) return
      if (currencyResult.value && isCurrencyCode(currencyResult.value)) setPreferredCurrencyState(currencyResult.value)
      if (ratesResult.value) {
        try {
          const stored = JSON.parse(ratesResult.value) as StoredRates
          const validRates = Object.fromEntries(
            Object.entries(stored.rates).filter(([, rate]) => Number.isFinite(rate) && rate > 0),
          ) as Partial<Record<CurrencyCode, number>>
          setRatesToUGX({ ...DEFAULT_RATES_TO_UGX, ...validRates, UGX: 1 })
          setRatesUpdatedAt(stored.updatedAt)
        } catch {
          // Corrupt preferences safely fall back to the bundled reference rates.
        }
      }
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const setPreferredCurrency = useCallback(async (code: CurrencyCode) => {
    setPreferredCurrencyState(code)
    await Preferences.set({ key: CURRENCY_PREFERENCE_KEY, value: code })
  }, [])

  const updateRates = useCallback(async (rates: Partial<Record<CurrencyCode, number>>, updatedAt = new Date().toISOString()) => {
    const validRates = Object.fromEntries(
      Object.entries(rates).filter(([, rate]) => typeof rate === 'number' && Number.isFinite(rate) && rate > 0),
    ) as Partial<Record<CurrencyCode, number>>
    const next = { ...ratesToUGX, ...validRates, UGX: 1 }
    setRatesToUGX(next)
    setRatesUpdatedAt(updatedAt)
    await Preferences.set({ key: CURRENCY_RATES_KEY, value: JSON.stringify({ rates: next, updatedAt }) })
  }, [ratesToUGX])

  const rateToUGX = useCallback((code: CurrencyCode) => ratesToUGX[code] || 1, [ratesToUGX])

  const convert = useCallback((amount: number, from: CurrencyCode, to: CurrencyCode = preferredCurrency, historicalRateToUGX?: number) => {
    if (from === to) return amount
    const sourceRate = historicalRateToUGX && historicalRateToUGX > 0 ? historicalRateToUGX : rateToUGX(from)
    const targetRate = rateToUGX(to)
    return (amount * sourceRate) / targetRate
  }, [preferredCurrency, rateToUGX])

  const transactionValue = useCallback((transaction: Transaction, to: CurrencyCode = preferredCurrency) =>
    convert(transaction.amount, transaction.currency_code, to, transaction.exchange_rate_to_ugx),
  [convert, preferredCurrency])

  const formatMoney = useCallback((amount: number, code: CurrencyCode = preferredCurrency) => {
    const currency = SUPPORTED_CURRENCIES.find((item) => item.code === code) || SUPPORTED_CURRENCIES[0]
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      // UGX has no minor unit; Intl automatically uses the ISO exponent for each code.
      maximumFractionDigits: code === 'UGX' ? 0 : 2,
    }).format(amount)
  }, [preferredCurrency])

  const formatTransaction = useCallback((transaction: Transaction, to: CurrencyCode = preferredCurrency) =>
    formatMoney(transactionValue(transaction, to), to),
  [formatMoney, preferredCurrency, transactionValue])

  const value = useMemo<CurrencyContextValue>(() => ({
    preferredCurrency,
    currencies: SUPPORTED_CURRENCIES,
    ratesToUGX,
    ratesUpdatedAt,
    setPreferredCurrency,
    updateRates,
    rateToUGX,
    convert,
    transactionValue,
    formatMoney,
    formatTransaction,
  }), [convert, formatMoney, formatTransaction, preferredCurrency, rateToUGX, ratesToUGX, ratesUpdatedAt, setPreferredCurrency, transactionValue, updateRates])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency must be used inside CurrencyProvider')
  return context
}
