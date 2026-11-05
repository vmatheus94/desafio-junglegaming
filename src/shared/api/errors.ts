import { AxiosError, isAxiosError, isCancel } from 'axios'
import type { z } from 'zod'
import { ApiErrorBodySchema, type ApiErrorCode } from '@/shared/contracts'

export type ApiErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'transient' | 'contract' | 'canceled'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: ApiErrorCode | 'network_error' | 'timeout' | 'contract_error' | 'canceled'
  readonly fields: Record<string, string>
  readonly details: unknown

  constructor(init: {
    kind: ApiErrorKind
    status: number | null
    code: ApiError['code']
    message: string
    fields?: Record<string, string>
    details?: unknown
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.fields = init.fields ?? {}
    this.details = init.details
  }

  get isTransient() {
    return this.kind === 'transient'
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 408 || status === 429 || status >= 500) return 'transient'
  return 'transient'
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isCancel(error)) {
    return new ApiError({ kind: 'canceled', status: null, code: 'canceled', message: 'Requisição cancelada' })
  }

  if (isAxiosError(error)) {
    const ax = error as AxiosError
    if (ax.code === 'ECONNABORTED' || ax.code === 'ETIMEDOUT') {
      return new ApiError({
        kind: 'transient',
        status: null,
        code: 'timeout',
        message: 'A requisição demorou mais que o esperado.',
      })
    }
    if (!ax.response) {
      return new ApiError({
        kind: 'transient',
        status: null,
        code: 'network_error',
        message: 'Sem conexão com o servidor. Verifique sua internet.',
      })
    }
    const status = ax.response.status
    const parsed = ApiErrorBodySchema.safeParse(ax.response.data)
    if (parsed.success) {
      const { code, message, fields, details } = parsed.data.error
      return new ApiError({ kind: kindFromStatus(status), status, code, message, fields, details })
    }
    return new ApiError({
      kind: kindFromStatus(status),
      status,
      code: status >= 500 ? 'internal_error' : 'validation_error',
      message: status >= 500 ? 'O servidor está indisponível no momento.' : 'Não foi possível concluir a operação.',
    })
  }

  return new ApiError({
    kind: 'transient',
    status: null,
    code: 'internal_error',
    message: error instanceof Error ? error.message : 'Erro inesperado',
  })
}

export function parseWith<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data)
  if (!result.success) {
    if (import.meta.env.DEV) console.error('[contract]', JSON.stringify(result.error.issues))
    throw new ApiError({
      kind: 'contract',
      status: null,
      code: 'contract_error',
      message: 'Resposta inesperada do servidor.',
      details: result.error.issues,
    })
  }
  return result.data
}

export function errorMessage(error: unknown): string {
  return toApiError(error).message
}
