import type { CreateOrderInput } from '@/shared/contracts'
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '@/shared/lib/storage'
import { createId } from '@/shared/lib/utils'

interface Attempt {
  key: string
  fingerprint: string
}

function fingerprint(input: CreateOrderInput) {
  return JSON.stringify([input.quoteId, input.walletId, input.network, input.buyer])
}

export function attemptKeyFor(userId: string, input: CreateOrderInput) {
  const storageKey = STORAGE_KEYS.idempotency(userId)
  const fp = fingerprint(input)
  const existing = readJson<Attempt>(storageKey, 'session')
  if (existing && existing.fingerprint === fp) return existing.key
  const attempt: Attempt = { key: createId('idem'), fingerprint: fp }
  writeJson(storageKey, attempt, 'session')
  return attempt.key
}

export function clearAttempt(userId: string) {
  removeKey(STORAGE_KEYS.idempotency(userId), 'session')
}

export function rememberPendingOrder(userId: string, orderId: string) {
  writeJson(STORAGE_KEYS.pendingOrder(userId), { orderId })
}

export function forgetPendingOrder(userId: string) {
  removeKey(STORAGE_KEYS.pendingOrder(userId))
}
