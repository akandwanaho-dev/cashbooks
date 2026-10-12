import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CurrencyCode } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Static formatter for non-React modules. UI components should use CurrencyContext. */
export const formatCurrency = (value: number, currency: CurrencyCode = 'UGX') =>
  new Intl.NumberFormat(currency === 'UGX' ? 'en-UG' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: currency === 'UGX' ? 0 : 2,
  }).format(value)

export const initials = (email?: string) =>
  (email?.split('@')[0] || 'CB')
    .split(/[._-]/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
