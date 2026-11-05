import { z } from 'zod'

export const EthAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')

export type EthAmount = z.infer<typeof EthAmountSchema>

export const IsoDateSchema = z.string().datetime({ offset: true })

export const ApiErrorCodeSchema = z.enum([
  'validation_error',
  'invalid_credentials',
  'unauthorized',
  'session_expired',
  'forbidden',
  'not_found',
  'conflict',
  'email_taken',
  'username_taken',
  'insufficient_availability',
  'edition_unavailable',
  'quote_outdated',
  'coupon_invalid',
  'coupon_expired',
  'idempotency_conflict',
  'wallet_rejected',
  'wallet_not_connected',
  'invalid_password',
  'service_unavailable',
  'internal_error',
])

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})
