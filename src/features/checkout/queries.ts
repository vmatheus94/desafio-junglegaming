import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiError, type ApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { useSession } from '@/shared/api/session-store'
import type { CreateOrderInput, NetworkId, Order, WalletType } from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'
import { connectWallet, createOrder, disconnectWallet, fetchOrder, fetchPendingOrders, fetchWalletConnection } from './api'
import { attemptKeyFor, clearAttempt, forgetPendingOrder, rememberPendingOrder } from './idempotency'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type OrderSubmitPhase = 'idle' | 'submitting' | 'recovering'

async function submitWithRecovery(input: CreateOrderInput, key: string, onPhase: (phase: OrderSubmitPhase) => void): Promise<Order> {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      onPhase(attempt === 0 ? 'submitting' : 'recovering')
      return await createOrder(input, key)
    } catch (error) {
      lastError = error
      if (!(isApiError(error) && error.isTransient) || attempt === 3) break
      announce('A confirmação está demorando. Verificando seu pedido…')
      await sleep(Math.min(800 * 2 ** attempt, 4000))
    }
  }
  throw lastError
}

export function useCreateOrder(onPhase: (phase: OrderSubmitPhase) => void) {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation<Order, ApiError, CreateOrderInput>({
    mutationKey: ['create-order'],
    mutationFn: (input) => {
      if (!session) throw new Error('Sessão necessária')
      return submitWithRecovery(input, attemptKeyFor(session.user.id, input), onPhase)
    },
    onSuccess: (order) => {
      if (!session) return
      queryClient.setQueryData(queryKeys.order(session.user.id, order.id), order)
      rememberPendingOrder(session.user.id, order.id)
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersPending(session.user.id) })
    },
    onSettled: () => onPhase('idle'),
  })
}

export function finishOrderTracking(userId: string) {
  clearAttempt(userId)
  forgetPendingOrder(userId)
}

export function useOrder(orderId: string) {
  const session = useSession()
  const userId = session?.user.id ?? 'anonymous'
  return useQuery({
    queryKey: queryKeys.order(userId, orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    enabled: !!session,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 5000 : false),
  })
}

export function usePendingOrders() {
  const session = useSession()
  return useQuery({
    queryKey: queryKeys.ordersPending(session?.user.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchPendingOrders(signal),
    enabled: !!session,
    staleTime: 10_000,
  })
}

export function useWalletConnection() {
  const session = useSession()
  return useQuery({
    queryKey: queryKeys.walletConnection(session?.user.id ?? 'anonymous'),
    queryFn: ({ signal }) => fetchWalletConnection(signal),
    enabled: !!session,
  })
}

export function useConnectWallet() {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation({
    mutationFn: ({
      walletId,
      network,
      provider,
      approved,
    }: {
      walletId: string
      network: NetworkId
      provider: WalletType
      approved: boolean
    }) => connectWallet(walletId, network, provider, approved),
    onSuccess: (connection) => {
      queryClient.setQueryData(queryKeys.walletConnection(session?.user.id ?? 'anonymous'), connection)
      announce('Carteira conectada.')
    },
  })
}

export function useDisconnectWallet() {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation({
    mutationFn: disconnectWallet,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.walletConnection(session?.user.id ?? 'anonymous'), null)
      announce('Carteira desconectada.')
    },
  })
}
