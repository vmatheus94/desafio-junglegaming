import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import { getGuestCartId, useSession } from '@/shared/api/session-store'
import type { AddCartItemInput, Cart, NetworkId } from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'
import { acknowledgePrices, addCartItem, applyCoupon, fetchCart, fetchQuote, removeCartItem, removeCoupon, updateCartItem } from './api'

export function useCartOwner() {
  const session = useSession()
  return session ? `user:${session.user.id}` : `guest:${getGuestCartId()}`
}

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: queryKeys.cart(owner),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 10_000,
  })
}

export function useQuote(network: NetworkId = 'ethereum', cart: Cart | undefined) {
  const owner = useCartOwner()
  return useQuery({
    queryKey: [...queryKeys.quote(owner, network), cart?.version ?? 0, cart?.couponCode ?? null],
    queryFn: ({ signal }) => fetchQuote(network, signal),
    enabled: !!cart && cart.items.length > 0,
    staleTime: 15_000,
  })
}

function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>, successMessage?: (vars: TVars) => string) {
  const queryClient = useQueryClient()
  const owner = useCartOwner()
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(queryKeys.cart(owner), cart)
      queryClient.invalidateQueries({ queryKey: queryKeys.quoteAll })
      if (successMessage) announce(successMessage(vars))
    },
    onError: (_e) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart(owner) })
    },
  })
}

export const useAddToCart = () =>
  useCartMutation(
    (input: AddCartItemInput) => addCartItem(input),
    (v) => `${v.quantity} item(ns) adicionado(s) ao carrinho.`,
  )

export const useUpdateCartItem = () =>
  useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => updateCartItem(itemId, quantity))

export const useRemoveCartItem = () =>
  useCartMutation(
    ({ itemId }: { itemId: string; name: string }) => removeCartItem(itemId),
    (v) => `${v.name} removido do carrinho.`,
  )

export const useApplyCoupon = () =>
  useCartMutation(
    (code: string) => applyCoupon(code),
    (c) => `Cupom ${c.toUpperCase()} aplicado.`,
  )

export const useRemoveCoupon = () =>
  useCartMutation(
    () => removeCoupon(),
    () => 'Cupom removido.',
  )

export const useAcknowledgePrices = () =>
  useCartMutation(
    () => acknowledgePrices(),
    () => 'Novos preços confirmados.',
  )

export function cartCount(cart: Cart | undefined) {
  return cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
}
