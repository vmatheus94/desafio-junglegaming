import { http } from '@/shared/api/http-client'
import { parseWith } from '@/shared/api/errors'
import { CatalogResponseSchema, NftResponseSchema, type CatalogQuery } from '@/shared/contracts'

export function toCatalogParams(q: CatalogQuery) {
  const params: Record<string, string> = {}
  if (q.q) params.q = q.q
  if (q.categories?.length) params.categories = q.categories.join(',')
  if (q.networks?.length) params.networks = q.networks.join(',')
  if (q.minPrice) params.minPrice = q.minPrice
  if (q.maxPrice) params.maxPrice = q.maxPrice
  if (q.tab) params.tab = q.tab
  if (q.sort) params.sort = q.sort
  if (q.page) params.page = String(q.page)
  if (q.pageSize) params.pageSize = String(q.pageSize)
  return params
}

export async function fetchCatalog(query: CatalogQuery, signal?: AbortSignal) {
  const { data } = await http.get('/nfts', { params: toCatalogParams(query), signal })
  return parseWith(CatalogResponseSchema, data)
}

export async function fetchNft(id: string, signal?: AbortSignal) {
  const { data } = await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })
  return parseWith(NftResponseSchema, data).nft
}
