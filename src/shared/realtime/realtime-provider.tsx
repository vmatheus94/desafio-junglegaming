import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useSession } from '@/shared/api/session-store'
import { NftUpdatedEventSchema, OrderUpdatedEventSchema, REALTIME_EVENTS } from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'
import { waitForBackend } from '@/shared/api/backend-ready'
import { applyNftUpdated, applyOrderUpdated, reconcileAfterReconnect, resetRealtimeMemory } from './reconcile'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

const RealtimeContext = createContext<{ status: RealtimeStatus }>({ status: 'connecting' })

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    resetRealtimeMemory()
    let socket: Socket | null = null
    let disposed = false
    let hasConnected = false

    const onConnect = () => {
      setStatus('connected')
      if (hasConnected) {
        reconcileAfterReconnect(queryClient)
        announce('Conexão em tempo real restabelecida. Dados atualizados.')
      }
      hasConnected = true
    }
    const onDisconnect = () => setStatus('reconnecting')
    const onConnectError = () => setStatus(hasConnected ? 'reconnecting' : 'offline')

    const onNftUpdated = (raw: unknown) => {
      const parsed = NftUpdatedEventSchema.safeParse(raw)
      if (!parsed.success) return
      const outcome = applyNftUpdated(queryClient, parsed.data)
      if (outcome.applied && outcome.message) {
        toast.warning(outcome.message, { id: `nft-${parsed.data.data.nftId}` })
        announce(outcome.message, 'assertive')
      }
    }

    const onOrderUpdated = (raw: unknown) => {
      const parsed = OrderUpdatedEventSchema.safeParse(raw)
      if (!parsed.success) return
      const outcome = applyOrderUpdated(queryClient, parsed.data, userId)
      if (outcome.applied && outcome.order.status !== 'pending') {
        const msg =
          outcome.order.status === 'confirmed'
            ? 'Pagamento confirmado! Seus NFTs estão na sua carteira.'
            : `Pagamento recusado. ${outcome.order.rejectionReason ?? ''}`
        announce(msg, 'assertive')
      }
    }

    waitForBackend()
      .then(() => import('socket.io-client'))
      .then(({ io }) => {
        if (disposed) return
        socket = io(SOCKET_URL, {
          path: '/socket.io',
          transports: ['websocket'],
          auth: token ? { token } : {},
          reconnectionDelay: 500,
          reconnectionDelayMax: 4000,
        })
        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)
        socket.on('connect_error', onConnectError)
        socket.on(REALTIME_EVENTS.nftUpdated, onNftUpdated)
        socket.on(REALTIME_EVENTS.orderUpdated, onOrderUpdated)
      })

    return () => {
      disposed = true
      if (!socket) return
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off(REALTIME_EVENTS.nftUpdated, onNftUpdated)
      socket.off(REALTIME_EVENTS.orderUpdated, onOrderUpdated)
      socket.disconnect()
    }
  }, [queryClient, token, userId])

  return <RealtimeContext.Provider value={{ status }}>{children}</RealtimeContext.Provider>
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext).status
}
