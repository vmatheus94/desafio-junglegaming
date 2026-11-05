export async function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomId(16)
  let data = new TextEncoder().encode(`${s}:${password}`)
  let digest: ArrayBuffer = new ArrayBuffer(0)
  for (let i = 0; i < 1000; i++) {
    digest = await crypto.subtle.digest('SHA-256', data)
    data = new Uint8Array(digest)
  }
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { hash, salt: s }
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const r = await hashPassword(password, salt)
  return r.hash === hash
}

export function randomId(len = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
