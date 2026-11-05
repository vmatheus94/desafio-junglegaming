import { z } from 'zod'
import { EthAmountSchema, IsoDateSchema } from './common'
import { EditionIdSchema } from './nft'
import { OrderSchema } from './commerce'

const envelope = <T extends string, R extends string, D extends z.ZodTypeAny>(type: T, resource: R, data: D) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: z.string() }),
    version: z.number().int().min(1),
    occurredAt: IsoDateSchema,
    data,
  })

export const NftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    nftId: z.string(),
    price: EthAmountSchema,
    soldOut: z.boolean(),
    editions: z.array(z.object({ id: EditionIdSchema, price: EthAmountSchema, available: z.number().int().min(0) })),
    reason: z.enum(['price_changed', 'availability_changed', 'sold_out']),
  }),
)
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>

export const OrderUpdatedEventSchema = envelope('order.updated', 'order', z.object({ userId: z.string(), order: OrderSchema }))
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const
