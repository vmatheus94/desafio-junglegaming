import { z } from 'zod'
import {
  CATEGORY_IDS,
  CatalogSortSchema,
  CatalogTabSchema,
  CategoryIdSchema,
  NETWORK_IDS,
  NetworkIdSchema,
  type CatalogQuery,
} from '@/shared/contracts'

const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => {
      const arr = Array.isArray(v) ? v : v ? v.split(',') : []
      const out = arr.filter((x) => item.safeParse(x).success) as z.infer<T>[]
      return out.length ? Array.from(new Set(out)) : undefined
    })

const decimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    const s = String(v).replace(',', '.')
    return /^\d+(\.\d{1,18})?$/.test(s) ? s : undefined
  })

export const catalogSearchSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim().slice(0, 80) : undefined))
    .catch(undefined),
  categories: list(CategoryIdSchema).catch(undefined),
  networks: list(NetworkIdSchema).catch(undefined),
  minPrice: decimal.catch(undefined),
  maxPrice: decimal.catch(undefined),
  tab: CatalogTabSchema.optional().catch(undefined),
  sort: CatalogSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

export function toCatalogQuery(s: CatalogSearch): CatalogQuery {
  return {
    q: s.q,
    categories: s.categories,
    networks: s.networks,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    tab: s.tab ?? 'all',
    sort: s.sort ?? 'recent',
    page: s.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function withFilters(prev: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  return { ...prev, ...patch, page: undefined }
}

export const ALL_CATEGORIES = CATEGORY_IDS
export const ALL_NETWORKS = NETWORK_IDS
