import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { resetGuestCartId, sessionStore, useSession, type EndReason } from '@/shared/api/session-store'
import type { Session } from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'
import { fetchSession, login, logout, mergeGuestCart, register } from './api'

export function clearPrivateData(queryClient: QueryClient) {
  queryClient.cancelQueries({ queryKey: queryKeys.userAll })
  queryClient.removeQueries({ queryKey: queryKeys.userAll })
  queryClient.removeQueries({ queryKey: queryKeys.cartAll })
  queryClient.removeQueries({ queryKey: queryKeys.quoteAll })
  queryClient.removeQueries({ queryKey: ['session'] })
}

export function endSession(queryClient: QueryClient, reason: EndReason) {
  sessionStore.clear(reason)
  clearPrivateData(queryClient)
}

async function startSession(queryClient: QueryClient, session: Session) {
  const previous = sessionStore.get()
  if (previous && previous.user.id !== session.user.id) {
    endSession(queryClient, 'switch')
  }
  clearPrivateData(queryClient)
  sessionStore.set(session)
  try {
    const { cart, adjusted } = await mergeGuestCart()
    resetGuestCartId()
    queryClient.setQueryData(queryKeys.cart(`user:${session.user.id}`), cart)
    if (adjusted.length) announce('Algumas quantidades do carrinho foram ajustadas à disponibilidade.')
  } catch {}
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await logout()
      } catch {}
    },
    onSettled: () => {
      endSession(queryClient, 'logout')
      announce('Você saiu da sua conta.')
    },
  })
}

export function useSessionValidation() {
  const session = useSession()
  return useQuery({
    queryKey: queryKeys.session(session?.token ?? null),
    queryFn: ({ signal }) => fetchSession(signal),
    enabled: !!session,
    staleTime: 60_000,
    retry: false,
  })
}

export { useSession }
