import Decimal from 'decimal.js'
import type { EditionId } from '@/shared/contracts'
import { db, edition, isSoldOut, mutateNft, nextEventId, nftPrice, nowIso, persist, settleDueOrders } from './db'
import { getScenario, resetCounters, SCENARIOS, setScenario, type ScenarioId } from './scenarios'
import { realtimeControl } from './realtime/server'
import { resetDb } from './db'

export const mockControl = {
  scenarios: Object.values(SCENARIOS),
  getScenario: () => getScenario().id,
  setScenario(id: ScenarioId) {
    setScenario(id)
  },

  async reset() {
    await resetDb()
    resetCounters()
    realtimeControl.setBlocked(false)
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith('kurio:') && k !== 'kurio:mock-scenario' && k !== 'kurio:mock-db' && k !== 'kurio:mock-panel') keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
      sessionStorage.clear()
    } catch {}
  },

  expireSessions() {
    const sessions = db().sessions
    Object.keys(sessions).forEach((t) => (sessions[t].expiresAt = Date.now() - 1))
    persist()
  },

  settleOrdersNow() {
    Object.values(db().orders).forEach((o) => {
      if (o.status === 'pending') o.resolveAt = Date.now() - 1
    })
    settleDueOrders()
  },

  orders() {
    return Object.values(db().orders).map((o) => ({ id: o.id, userId: o.userId, status: o.status, total: o.total }))
  },

  nft(nftId: string) {
    const n = db().nfts[nftId]
    return n
      ? { id: n.id, price: nftPrice(n), version: n.version, editions: n.editions.map((e) => ({ ...e })), soldOut: isSoldOut(n) }
      : null
  },

  changePrice(nftId: string, editionId: EditionId = '1-50', price?: string) {
    return !!mutateNft(
      nftId,
      (n) => {
        const e = edition(n, editionId)
        if (e) e.price = price ?? new Decimal(e.price).plus('0.10').toFixed()
      },
      'price_changed',
    )
  },

  changeAvailability(nftId: string, editionId: EditionId = '1-50', available = 0) {
    return !!mutateNft(
      nftId,
      (n) => {
        const e = edition(n, editionId)
        if (e) e.available = available
      },
      'availability_changed',
    )
  },

  realtime: {
    disconnect: () => realtimeControl.disconnectAll(),
    setBlocked: (v: boolean) => realtimeControl.setBlocked(v),
    isBlocked: () => realtimeControl.isBlocked(),
    connections: () => realtimeControl.connectionCount(),
    replayLast: () => realtimeControl.replayLast(),
    sendStaleNftEvent(nftId: string) {
      const n = db().nfts[nftId]
      if (!n) return false
      realtimeControl.emitRaw('nft.updated', {
        eventId: nextEventId(),
        type: 'nft.updated',
        resource: { type: 'nft', id: n.id },
        version: Math.max(1, n.version - 1),
        occurredAt: nowIso(),
        data: {
          nftId: n.id,
          price: '999.99',
          soldOut: false,
          editions: n.editions.map((e) => ({ id: e.id, price: '999.99', available: e.available })),
          reason: 'price_changed',
        },
      })
      return true
    },
  },
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}
