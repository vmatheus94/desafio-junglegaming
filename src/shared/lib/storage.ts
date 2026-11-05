type Area = 'local' | 'session'

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const STORAGE_KEYS = {
  session: 'kurio:session',
  guestCart: 'kurio:guest-cart-id',
  checkoutDraft: (userId: string) => `kurio:checkout-draft:${userId}`,
  pendingOrder: (userId: string) => `kurio:pending-order:${userId}`,
  idempotency: (userId: string) => `kurio:order-attempt:${userId}`,
} as const

export function readJson<T>(key: string, kind: Area = 'local'): T | null {
  const raw = area(kind)?.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown, kind: Area = 'local') {
  try {
    area(kind)?.setItem(key, JSON.stringify(value))
  } catch {}
}

export function removeKey(key: string, kind: Area = 'local') {
  try {
    area(kind)?.removeItem(key)
  } catch {}
}

export function readString(key: string, kind: Area = 'local') {
  try {
    return area(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeString(key: string, value: string, kind: Area = 'local') {
  try {
    area(kind)?.setItem(key, value)
  } catch {}
}

export function clearAppStorage() {
  for (const kind of ['local', 'session'] as const) {
    const s = area(kind)
    if (!s) continue
    const keys: string[] = []
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (k?.startsWith('kurio:')) keys.push(k)
    }
    keys.forEach((k) => s.removeItem(k))
  }
}
