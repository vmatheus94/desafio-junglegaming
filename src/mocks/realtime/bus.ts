import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/contracts'

export type BusMessage = { kind: 'nft'; event: NftUpdatedEvent } | { kind: 'order'; event: OrderUpdatedEvent }

type Listener = (msg: BusMessage) => void
const listeners = new Set<Listener>()

export const bus = {
  emit(msg: BusMessage) {
    listeners.forEach((l) => l(msg))
  },
  subscribe(l: Listener) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}
