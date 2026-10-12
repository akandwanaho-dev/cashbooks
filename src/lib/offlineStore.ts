import Dexie, { type EntityTable } from 'dexie'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Transaction } from '@/types'

export type MutationOperation = 'create' | 'update' | 'delete'

export interface PendingMutation {
  mutation_id: string
  user_id: string
  entity_id: string
  operation: MutationOperation
  payload: Transaction | null
  created_at: string
  attempts: number
}

class CashbookOfflineDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  outbox!: EntityTable<PendingMutation, 'mutation_id'>

  constructor() {
    super('cashbook-offline-v1')
    this.version(1).stores({
      transactions: '&id, user_id, date, updated_at',
      outbox: '&mutation_id, user_id, entity_id, created_at, [user_id+entity_id]',
    })
  }
}

const db = new CashbookOfflineDatabase()

export async function loadCachedTransactions(userId: string) {
  return db.transactions.where('user_id').equals(userId).reverse().sortBy('date')
}

export async function cacheTransaction(transaction: Transaction) {
  await db.transactions.put(transaction)
}

export async function removeCachedTransaction(id: string) {
  await db.transactions.delete(id)
}

/**
 * Replaces cloud-backed rows while preserving local rows that still have an
 * outbox mutation. This prevents a reconnect race from hiding unsynced work.
 */
export async function cacheCloudSnapshot(userId: string, cloudRows: Transaction[]) {
  return db.transaction('rw', db.transactions, db.outbox, async () => {
    const pending = await db.outbox.where('user_id').equals(userId).toArray()
    const pendingIds = new Set(pending.map((item) => item.entity_id))
    const pendingRows = (await db.transactions.where('user_id').equals(userId).toArray())
      .filter((row) => pendingIds.has(row.id))
    const pendingDeletes = new Set(pending.filter((item) => item.operation === 'delete').map((item) => item.entity_id))
    const merged = [
      ...cloudRows.filter((row) => !pendingIds.has(row.id) && !pendingDeletes.has(row.id)),
      ...pendingRows.filter((row) => !pendingDeletes.has(row.id)),
    ]
    await db.transactions.where('user_id').equals(userId).delete()
    await db.transactions.bulkPut(merged)
    return merged
  })
}

/** Coalesce repeat edits so the outbox remains small and deterministic. */
export async function queueMutation(mutation: Omit<PendingMutation, 'mutation_id' | 'attempts'>) {
  await db.transaction('rw', db.outbox, async () => {
    const existing = await db.outbox.where('[user_id+entity_id]').equals([mutation.user_id, mutation.entity_id]).first()
    if (existing?.operation === 'create' && mutation.operation === 'delete') {
      await db.outbox.delete(existing.mutation_id)
      return
    }
    const operation: MutationOperation = existing?.operation === 'create' ? 'create' : mutation.operation
    if (existing) await db.outbox.delete(existing.mutation_id)
    await db.outbox.put({
      ...mutation,
      operation,
      mutation_id: crypto.randomUUID(),
      attempts: existing?.attempts || 0,
    })
  })
}

export async function pendingMutationCount(userId: string) {
  return db.outbox.where('user_id').equals(userId).count()
}

export async function clearUserCache(userId: string) {
  await db.transaction('rw', db.transactions, db.outbox, async () => {
    await db.transactions.where('user_id').equals(userId).delete()
    await db.outbox.where('user_id').equals(userId).delete()
  })
}

/**
 * Sends queued mutations oldest-first. A failed mutation stays in the queue and
 * stops the pass, preserving operation order. Supabase RLS still authorizes all
 * writes; the offline cache never bypasses server security.
 */
export async function flushOutbox(client: SupabaseClient, userId: string) {
  const mutations = await db.outbox.where('user_id').equals(userId).sortBy('created_at')
  let flushed = 0
  for (const mutation of mutations) {
    let error: { message: string } | null = null
    if (mutation.operation === 'delete') {
      const result = await client.from('transactions').delete().eq('id', mutation.entity_id)
      error = result.error
    } else if (mutation.operation === 'create' && mutation.payload) {
      const result = await client.from('transactions').upsert(mutation.payload, { onConflict: 'id' })
      error = result.error
    } else if (mutation.payload) {
      const changes: Partial<Transaction> = { ...mutation.payload }
      delete changes.id
      delete changes.user_id
      delete changes.created_at
      const result = await client.from('transactions').update(changes).eq('id', mutation.entity_id)
      error = result.error
    }

    if (error) {
      await db.outbox.update(mutation.mutation_id, { attempts: mutation.attempts + 1 })
      throw new Error(error.message)
    }
    await db.outbox.delete(mutation.mutation_id)
    flushed += 1
  }
  return flushed
}
