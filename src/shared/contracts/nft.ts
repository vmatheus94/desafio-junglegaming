import { z } from 'zod'
import { EthAmountSchema, IsoDateSchema, PaginationSchema } from './common'

export const CATEGORY_IDS = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const

export const NETWORK_IDS = ['ethereum', 'polygon', 'solana'] as const

export const CategoryIdSchema = z.enum(CATEGORY_IDS)
export const NetworkIdSchema = z.enum(NETWORK_IDS)
export type CategoryId = z.infer<typeof CategoryIdSchema>
export type NetworkId = z.infer<typeof NetworkIdSchema>

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const CATALOG_SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const CatalogTabSchema = z.enum(CATALOG_TABS)
export const CatalogSortSchema = z.enum(CATALOG_SORTS)
export type CatalogTab = z.infer<typeof CatalogTabSchema>
export type CatalogSort = z.infer<typeof CatalogSortSchema>

export const EDITION_IDS = ['1-1', '1-10', '1-50', 'open'] as const
export const EditionIdSchema = z.enum(EDITION_IDS)
export type EditionId = z.infer<typeof EditionIdSchema>

export const EditionSchema = z.object({
  id: EditionIdSchema,
  label: z.string(),
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
  price: EthAmountSchema,
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof EditionSchema>

export const NftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  price: EthAmountSchema,
  compareAtPrice: EthAmountSchema.nullable(),
  category: CategoryIdSchema,
  network: NetworkIdSchema,
  badge: z.string().nullable(),
  soldOut: z.boolean(),
  listedAt: IsoDateSchema,
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof NftSummarySchema>

export const NftDetailSchema = NftSummarySchema.extend({
  images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
  description: z.string(),
  longDescription: z.string(),
  collection: z.object({ id: z.string(), name: z.string() }),
  attributes: z.array(z.string()),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  creator: z.object({ name: z.string(), royaltyPercent: z.number() }),
  contract: z.object({ address: z.string(), standard: z.string() }),
  networkLabel: z.string(),
  editions: z.array(EditionSchema).min(1),
  related: z.array(NftSummarySchema),
})
export type NftDetail = z.infer<typeof NftDetailSchema>

export const CatalogQuerySchema = z.object({
  q: z.string().optional(),
  categories: z.array(CategoryIdSchema).optional(),
  networks: z.array(NetworkIdSchema).optional(),
  minPrice: EthAmountSchema.optional(),
  maxPrice: EthAmountSchema.optional(),
  tab: CatalogTabSchema.optional(),
  sort: CatalogSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type CatalogQuery = z.infer<typeof CatalogQuerySchema>

export const FacetCountSchema = z.object({ id: z.string(), count: z.number().int() })

export const CatalogResponseSchema = PaginationSchema.extend({
  items: z.array(NftSummarySchema),
  facets: z.object({
    categories: z.array(FacetCountSchema.extend({ id: CategoryIdSchema })),
    networks: z.array(FacetCountSchema.extend({ id: NetworkIdSchema })),
    priceRange: z.object({ min: EthAmountSchema, max: EthAmountSchema }),
  }),
  featured: NftSummarySchema.nullable(),
  applied: CatalogQuerySchema,
})
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>

export const NftResponseSchema = z.object({ nft: NftDetailSchema })
