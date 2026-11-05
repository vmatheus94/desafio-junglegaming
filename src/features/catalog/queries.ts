import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import type { CatalogQuery } from '@/shared/contracts'
import { fetchCatalog, fetchNft } from './api'

export const catalogQuery = (params: CatalogQuery) =>
  queryOptions({
    queryKey: queryKeys.catalog(params),
    queryFn: ({ signal }) => fetchCatalog(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const nftQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nft(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
    staleTime: 15_000,
  })
