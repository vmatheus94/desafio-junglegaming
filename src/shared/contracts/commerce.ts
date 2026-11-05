import { z } from 'zod'
import { EthAmountSchema, IsoDateSchema } from './common'
import { EditionIdSchema, NetworkIdSchema } from './nft'
import { WalletTypeSchema } from './account'

export const CartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: EditionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: EthAmountSchema,
  acceptedUnitPrice: EthAmountSchema,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
  nftVersion: z.number().int(),
})
export type CartItem = z.infer<typeof CartItemSchema>

export const CartSchema = z.object({
  id: z.string(),
  items: z.array(CartItemSchema),
  couponCode: z.string().nullable(),
  version: z.number().int(),
  updatedAt: IsoDateSchema,
})
export type Cart = z.infer<typeof CartSchema>
export const CartResponseSchema = z.object({ cart: CartSchema })

export const AddCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: EditionIdSchema,
  quantity: z.number().int().min(1),
})
export type AddCartItemInput = z.infer<typeof AddCartItemInputSchema>

export const UpdateCartItemInputSchema = z.object({ quantity: z.number().int().min(1) })

export const CouponInputSchema = z.object({
  code: z.string().trim().min(1, 'Digite um código promocional').max(20, 'Código muito longo'),
})

export const QuoteIssueSchema = z.object({
  code: z.enum(['price_changed', 'insufficient_availability', 'sold_out', 'coupon_expired', 'coupon_invalid']),
  itemId: z.string().nullable(),
  message: z.string(),
})
export type QuoteIssue = z.infer<typeof QuoteIssueSchema>

export const QuoteLineSchema = z.object({
  itemId: z.string(),
  nftId: z.string(),
  editionId: EditionIdSchema,
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: EthAmountSchema,
  lineTotal: EthAmountSchema,
})

export const QuoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  lines: z.array(QuoteLineSchema),
  subtotal: EthAmountSchema,
  discount: EthAmountSchema,
  coupon: z.object({ code: z.string(), label: z.string(), percent: z.number() }).nullable(),
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
  currency: z.literal('ETH'),
  issues: z.array(QuoteIssueSchema),
  expiresAt: IsoDateSchema,
  createdAt: IsoDateSchema,
})
export type Quote = z.infer<typeof QuoteSchema>
export const QuoteResponseSchema = z.object({ quote: QuoteSchema })

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const BuyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição').max(40, 'Máximo de 40 caracteres'),
  username: z
    .string()
    .trim()
    .min(3, 'Informe seu nome de usuário')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto ou _'),
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  note: z.string().trim().max(280, 'Máximo de 280 caracteres').optional(),
})
export type Buyer = z.infer<typeof BuyerSchema>

export const CreateOrderInputSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: NetworkIdSchema,
  buyer: BuyerSchema,
})
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>

export const OrderLineSchema = QuoteLineSchema.omit({ itemId: true }).extend({ editionLabel: z.string() })

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  version: z.number().int(),
  lines: z.array(OrderLineSchema),
  subtotal: EthAmountSchema,
  discount: EthAmountSchema,
  couponCode: z.string().nullable(),
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
  wallet: z.object({ id: z.string(), type: WalletTypeSchema, label: z.string(), address: z.string() }),
  network: NetworkIdSchema,
  buyer: z.object({ displayName: z.string(), username: z.string(), email: z.string() }),
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
})
export type Order = z.infer<typeof OrderSchema>
export const OrderResponseSchema = z.object({ order: OrderSchema })
export const OrdersResponseSchema = z.object({ orders: z.array(OrderSchema) })

export const QuoteOutdatedDetailsSchema = z.object({ quote: QuoteSchema })
