import { useSyncExternalStore } from 'react'
import type { Session } from '@/shared/contracts'
import { readJson, removeKey, STORAGE_KEYS, writeJson, readString, writeString } from '@/shared/lib/storage'
import { createId } from '@/shared/lib/utils'

export type EndReason = 'logout' | 'expired' | 'switch'

type Listener = () => void
const listeners = new Set<Listener>()
let current: Session | null = readJson<Session>(STORAGE_KEYS.session)
let lastEndReason: EndReason | null = null

function emit() {
  listeners.forEach((l) => l())
}

export const sessionStore = {
  get: () => current,
  getToken: () => current?.token ?? null,
  getUserId: () => current?.user.id ?? null,
  set(session: Session) {
    current = session
    lastEndReason = null
    writeJson(STORAGE_KEYS.session, session)
    emit()
  },
  updateUser(user: Session['user']) {
    if (!current) return
    current = { ...current, user }
    writeJson(STORAGE_KEYS.session, current)
    emit()
  },
  clear(reason: EndReason) {
    if (!current) return
    current = null
    lastEndReason = reason
    removeKey(STORAGE_KEYS.session)
    emit()
  },
  consumeEndReason() {
    const r = lastEndReason
    lastEndReason = null
    return r
  },
  peekEndReason: () => lastEndReason,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}

export function getGuestCartId() {
  let id = readString(STORAGE_KEYS.guestCart)
  if (!id) {
    id = createId('guest')
    writeString(STORAGE_KEYS.guestCart, id)
  }
  return id
}

export function resetGuestCartId() {
  removeKey(STORAGE_KEYS.guestCart)
}
