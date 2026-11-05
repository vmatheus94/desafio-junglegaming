import { delay, http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { z } from 'zod'
import type { ApiErrorCode } from '@/shared/contracts'
import { db, persist, publicUser, type UserRecord } from '../db'
import { firstTime, getScenario, is, nextLatency } from '../scenarios'

export const API = `${import.meta.env.VITE_API_BASE_URL || '/api'}`

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

export function validationError(error: z.ZodError, message = 'Verifique os campos destacados.') {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  return apiError(422, 'validation_error', message, { fields })
}

export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export interface AuthContext {
  user: UserRecord
  token: string
}

export function authenticate(request: Request): AuthContext | Response {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return apiError(401, 'unauthorized', 'Entre na sua conta para continuar.')
  const session = db().sessions[token]
  if (!session) return apiError(401, 'session_expired', 'Sua sessão expirou. Entre novamente.')
  if (session.expiresAt <= Date.now()) {
    delete db().sessions[token]
    persist()
    return apiError(401, 'session_expired', 'Sua sessão expirou. Entre novamente.')
  }
  const user = db().users[session.userId]
  if (!user) return apiError(401, 'unauthorized', 'Sessão inválida.')
  return { user, token }
}

export function optionalUser(request: Request): AuthContext | null {
  if (!request.headers.get('Authorization')) return null
  const r = authenticate(request)
  return r instanceof Response ? null : r
}

export { publicUser }

type Resource = 'auth' | 'catalog' | 'nft' | 'favorites' | 'cart' | 'quote' | 'orders' | 'profile' | 'wallets'

export function scenario<P extends PathParams, B extends DefaultBodyType>(
  resource: Resource,
  resolver: HttpResponseResolver<P, B>,
): HttpResponseResolver<P, B> {
  return async (info) => {
    if (is('offline')) return HttpResponse.error()

    await delay(nextLatency(resource))

    if (is('flaky') && firstTime(`${info.request.method} ${resource}`)) {
      return apiError(503, 'service_unavailable', 'Serviço temporariamente indisponível. Tente novamente.')
    }
    if (is('server-error') && (resource === 'catalog' || resource === 'nft')) {
      return apiError(500, 'internal_error', 'Erro interno no servidor.')
    }
    if (is('favorites-failure') && resource === 'favorites' && info.request.method !== 'GET') {
      return apiError(500, 'internal_error', 'Não foi possível atualizar seus favoritos.')
    }
    return resolver(info)
  }
}

export { http, HttpResponse, delay, getScenario }
