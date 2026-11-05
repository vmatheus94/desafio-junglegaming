import Decimal from 'decimal.js'
import {
  CATEGORY_IDS,
  CatalogSortSchema,
  CatalogTabSchema,
  NETWORK_IDS,
  type CatalogQuery,
  type CatalogResponse,
  type CategoryId,
  type NetworkId,
} from '@/shared/contracts'
import { db, isSoldOut, nftPrice, toDetail, toSummary } from '../db'
import type { NftRecord } from '../fixtures/nfts'
import { is } from '../scenarios'
import { API, apiError, http, HttpResponse, scenario } from './utils'

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const FEATURED_ID = 'sage-nomad-009'

function list<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as readonly string[]).includes(s))
}

function decimalParam(raw: string | null) {
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return undefined
  return raw
}

function matchesText(n: NftRecord, q: string) {
  const hay = `${n.name} ${n.collection.name} ${n.attributes.join(' ')} ${n.creator}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term))
}

export const catalogHandlers = [
  http.get(
    `${API}/nfts`,
    scenario('catalog', ({ request }) => {
      const url = new URL(request.url)
      const p = url.searchParams
      const q = p.get('q')?.trim() || undefined
      const categories = list<CategoryId>(p.get('categories'), CATEGORY_IDS)
      const networks = list<NetworkId>(p.get('networks'), NETWORK_IDS)
      const minPrice = decimalParam(p.get('minPrice'))
      const maxPrice = decimalParam(p.get('maxPrice'))
      const tab = CatalogTabSchema.catch('all').parse(p.get('tab') ?? 'all')
      const sort = CatalogSortSchema.catch('recent').parse(p.get('sort') ?? 'recent')
      const pageSize = Math.min(48, Math.max(1, Number(p.get('pageSize')) || 9))
      const requestedPage = Math.max(1, Math.floor(Number(p.get('page')) || 1))

      const all = is('empty-catalog') ? [] : Object.values(db().nfts)
      const newest = all.reduce((m, n) => Math.max(m, Date.parse(n.listedAt)), 0)

      const base = all.filter((n) => {
        if (q && !matchesText(n, q)) return false
        if (tab === 'new' && Date.parse(n.listedAt) < newest - NEW_WINDOW_MS) return false
        if (tab === 'trending' && n.trendingScore < 60) return false
        return true
      })

      const filtered = base.filter((n) => {
        const price = new Decimal(nftPrice(n))
        if (categories.length && !categories.includes(n.category)) return false
        if (networks.length && !networks.includes(n.network)) return false
        if (minPrice && price.lessThan(minPrice)) return false
        if (maxPrice && price.greaterThan(maxPrice)) return false
        return true
      })

      const sorted = [...filtered].sort((a, b) => {
        switch (sort) {
          case 'price-asc':
            return new Decimal(nftPrice(a)).comparedTo(nftPrice(b)) || a.name.localeCompare(b.name)
          case 'price-desc':
            return new Decimal(nftPrice(b)).comparedTo(nftPrice(a)) || a.name.localeCompare(b.name)
          case 'name':
            return a.name.localeCompare(b.name, 'pt-BR')
          default:
            return Date.parse(b.listedAt) - Date.parse(a.listedAt)
        }
      })

      const total = sorted.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const page = Math.min(requestedPage, totalPages)
      const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary)

      const prices = all.map((n) => new Decimal(nftPrice(n)))
      const priceRange = prices.length
        ? { min: Decimal.min(...prices).toFixed(), max: Decimal.max(...prices).toFixed() }
        : { min: '0', max: '0' }

      const featuredRecord = all.find((n) => n.id === FEATURED_ID && !isSoldOut(n)) ?? null

      const applied: CatalogQuery = {
        ...(q ? { q } : {}),
        ...(categories.length ? { categories } : {}),
        ...(networks.length ? { networks } : {}),
        ...(minPrice ? { minPrice } : {}),
        ...(maxPrice ? { maxPrice } : {}),
        tab,
        sort,
        page,
        pageSize,
      }

      const body: CatalogResponse = {
        items,
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : totalPages,
        facets: {
          categories: CATEGORY_IDS.map((id) => ({ id, count: base.filter((n) => n.category === id).length })),
          networks: NETWORK_IDS.map((id) => ({ id, count: base.filter((n) => n.network === id).length })),
          priceRange,
        },
        featured: featuredRecord ? toSummary(featuredRecord) : null,
        applied,
      }
      return HttpResponse.json(body)
    }),
  ),

  http.get(
    `${API}/nfts/:nftId`,
    scenario('nft', ({ params }) => {
      const n = db().nfts[String(params.nftId)]
      if (!n) return apiError(404, 'not_found', 'Este NFT não existe ou foi removido.')
      return HttpResponse.json({ nft: toDetail(n) })
    }),
  ),
]
