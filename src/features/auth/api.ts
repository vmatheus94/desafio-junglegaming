import { z } from 'zod'
import { http } from '@/shared/api/http-client'
import { parseWith } from '@/shared/api/errors'
import { CartResponseSchema, SessionInfoSchema, SessionSchema, type LoginInput, type RegisterInput } from '@/shared/contracts'

export async function login(input: LoginInput) {
  const { data } = await http.post('/auth/login', input)
  return parseWith(SessionSchema, data)
}

export async function register(input: RegisterInput) {
  const { data } = await http.post('/auth/register', input)
  return parseWith(SessionSchema, data)
}

export async function logout() {
  await http.post('/auth/logout')
}

export async function fetchSession(signal?: AbortSignal) {
  const { data } = await http.get('/session', { signal })
  return parseWith(SessionInfoSchema, data)
}

export async function mergeGuestCart() {
  const { data } = await http.post('/cart/merge')
  return parseWith(CartResponseSchema.extend({ adjusted: z.array(z.string()) }), data)
}
