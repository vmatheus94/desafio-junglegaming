import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import type { Cart, CatalogResponse, NftDetail, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/money'

const MAX_SEEN = 500
const seenEvents = new Set<string>()
const nftVersions = new Map<string, number>()

export function resetRealtimeMemory() {
  seenEvents.clear()
  nftVersions.clear()
}

function markSeen(eventId: string) {
  if (seenEvents.has(eventId)) return false
  seenEvents.add(eventId)
  if (seenEvents.size > MAX_SEEN) {
    const first = seenEvents.values().next().value
    if (first) seenEvents.delete(first)
  }
  return true
}

function knownNftVersion(qc: QueryClient, nftId: string) {
  let v = nftVersions.get(nftId) ?? 0
  const detail = qc.getQueryData<NftDetail>(queryKeys.nft(nftId))
  if (detail) v = Math.max(v, detail.version)
  for (const [, data] of qc.getQueriesData<CatalogResponse>({ queryKey: queryKeys.catalogAll })) {
    const item = data?.items.find((i) => i.id === nftId)
    if (item) v = Math.max(v, item.version)
  }
  return v
}

export type NftEventOutcome = { applied: false; reason: 'duplicate' | 'stale' } | { applied: true; inCart: boolean; message: string | null }

export function applyNftUpdated(qc: QueryClient, event: NftUpdatedEvent): NftEventOutcome {
  if (!markSeen(event.eventId)) return { applied: false, reason: 'duplicate' }
  const { nftId } = event.data
  if (event.version <= knownNftVersion(qc, nftId)) return { applied: false, reason: 'stale' }
  nftVersions.set(nftId, event.version)

  const patchSummary = <T extends NftSummary>(n: T): T =>
    n.id === nftId ? { ...n, price: event.data.price, soldOut: event.data.soldOut, version: event.version } : n

  qc.setQueryData<NftDetail>(queryKeys.nft(nftId), (old) => {
    if (!old) return old
    return {
      ...patchSummary(old),
      editions: old.editions.map((e) => {
        const upd = event.data.editions.find((x) => x.id === e.id)
        return upd ? { ...e, price: upd.price, available: upd.available } : e
      }),
    }
  })

  qc.setQueriesData<CatalogResponse>({ queryKey: queryKeys.catalogAll }, (old) =>
    old ? { ...old, items: old.items.map(patchSummary), featured: old.featured ? patchSummary(old.featured) : old.featured } : old,
  )

  qc.setQueriesData<NftDetail>({ queryKey: queryKeys.nftAll }, (old) =>
    old && old.id !== nftId ? { ...old, related: old.related.map(patchSummary) } : old,
  )

  let inCart = false
  let message: string | null = null
  for (const [, cart] of qc.getQueriesData<Cart>({ queryKey: queryKeys.cartAll })) {
    const item = cart?.items.find((i) => i.nftId === nftId)
    if (item) {
      inCart = true
      const upd = event.data.editions.find((e) => e.id === item.editionId)
      if (upd && upd.available === 0) message = `${item.name} (${item.editionLabel}) esgotou e precisa ser removido do carrinho.`
      else if (upd && upd.available < item.quantity)
        message = `Restam apenas ${upd.available} unidade(s) de ${item.name} (${item.editionLabel}).`
      else if (upd && upd.price !== item.unitPrice)
        message = `O preço de ${item.name} (${item.editionLabel}) mudou para ${formatEth(upd.price)}.`
    }
  }
  if (inCart) {
    qc.invalidateQueries({ queryKey: queryKeys.cartAll })
    qc.invalidateQueries({ queryKey: queryKeys.quoteAll })
  }
  return { applied: true, inCart, message }
}

export type OrderEventOutcome = { applied: false; reason: 'duplicate' | 'stale' | 'foreign' | 'terminal' } | { applied: true; order: Order }

export function applyOrderUpdated(qc: QueryClient, event: OrderUpdatedEvent, currentUserId: string | null): OrderEventOutcome {
  if (!currentUserId || event.data.userId !== currentUserId) return { applied: false, reason: 'foreign' }
  if (!markSeen(event.eventId)) return { applied: false, reason: 'duplicate' }
  const key = queryKeys.order(currentUserId, event.resource.id)
  const cached = qc.getQueryData<Order>(key)
  if (cached && cached.version >= event.version) return { applied: false, reason: 'stale' }
  if (cached && cached.status !== 'pending') return { applied: false, reason: 'terminal' }

  qc.setQueryData<Order>(key, event.data.order)
  if (event.data.order.status !== 'pending') {
    qc.invalidateQueries({ queryKey: queryKeys.ordersPending(currentUserId) })
    qc.invalidateQueries({ queryKey: queryKeys.cartAll })
    qc.invalidateQueries({ queryKey: queryKeys.quoteAll })
  }
  return { applied: true, order: event.data.order }
}

export function reconcileAfterReconnect(qc: QueryClient) {
  const opts = { refetchType: 'active' as const }
  qc.invalidateQueries({ queryKey: queryKeys.catalogAll, ...opts })
  qc.invalidateQueries({ queryKey: queryKeys.nftAll, ...opts })
  qc.invalidateQueries({ queryKey: queryKeys.cartAll, ...opts })
  qc.invalidateQueries({ queryKey: queryKeys.quoteAll, ...opts })
  qc.invalidateQueries({ queryKey: queryKeys.userAll, ...opts })
}
