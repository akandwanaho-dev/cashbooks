import type { SupabaseClient } from '@supabase/supabase-js'

const REQUIRED_TABLES = [
  'transactions',
  'accounts',
  'profiles',
  'money_quotes',
  'notification_preferences',
  'user_roles',
  'user_preferences',
  'app_settings',
] as const

export const DATABASE_SETUP_MESSAGE =
  'Supabase is connected, but the Cashbook database is not installed. Run schema.sql, mobile_migration.sql, and product_migration.sql in the Supabase SQL Editor.'

type SupabaseErrorLike = {
  code?: string
  message?: string
  status?: number
  error_description?: string
}

function errorDetails(error: unknown): SupabaseErrorLike {
  if (error && typeof error === 'object') return error as SupabaseErrorLike
  return { message: typeof error === 'string' ? error : undefined }
}

export function isMissingDatabaseObject(error: unknown) {
  const details = errorDetails(error)
  const message = `${details.message || ''} ${details.error_description || ''}`
  return details.code === 'PGRST205' || details.code === '42P01' || /could not find the table|relation .* does not exist/i.test(message)
}

export function isSupabaseNetworkError(error: unknown) {
  const message = errorDetails(error).message || String(error)
  return /failed to fetch|network|load failed|offline|timeout|connection/i.test(message)
}

/** Converts backend/Auth errors into safe instructions instead of raw API failures. */
export function getSupabaseErrorMessage(error: unknown, fallback = 'The database request could not be completed.') {
  const details = errorDetails(error)
  const message = details.message || details.error_description || ''
  const normalized = message.toLowerCase()

  if (isMissingDatabaseObject(error)) return DATABASE_SETUP_MESSAGE
  if (isSupabaseNetworkError(error)) return 'Supabase cannot be reached. Check your internet connection and try again.'
  if (normalized.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (normalized.includes('email not confirmed')) return 'Confirm your email address before signing in.'
  if (normalized.includes('user already registered')) return 'An account already exists for this email address.'
  if (normalized.includes('password should be') || normalized.includes('weak password')) return 'Use a stronger password with at least 8 characters.'
  if (normalized.includes('rate limit') || details.status === 429) return 'Too many attempts. Wait a moment and try again.'
  if (details.code === '42501' || normalized.includes('row-level security') || normalized.includes('permission denied')) {
    return 'Supabase denied this request. Sign in again and verify that the included Row Level Security migrations were installed.'
  }
  if (details.code === '23505') return 'That record already exists.'
  if (details.code === '23503') return 'This record is still used elsewhere and cannot be removed.'

  return message.trim() || fallback
}

/**
 * Confirms that the required PostgREST resources exist. Anonymous permission
 * errors are accepted because private tables deliberately deny the anon role.
 */
export async function validateSupabaseSchema(client: SupabaseClient) {
  const results = await Promise.all(
    REQUIRED_TABLES.map(async (table) => ({
      table,
      result: await client.from(table).select('*', { head: true, count: 'exact' }).limit(1),
    })),
  )

  const missing = results.filter(({ result }) => result.error && isMissingDatabaseObject(result.error)).map(({ table }) => table)
  if (missing.length) throw new Error(`${DATABASE_SETUP_MESSAGE} Missing: ${missing.join(', ')}.`)

  const blocking = results.find(({ result }) => {
    if (!result.error) return false
    const details = errorDetails(result.error)
    const message = details.message?.toLowerCase() || ''
    return details.code !== '42501' && !message.includes('permission denied')
  })
  if (blocking?.result.error) throw new Error(getSupabaseErrorMessage(blocking.result.error))

  return true
}
