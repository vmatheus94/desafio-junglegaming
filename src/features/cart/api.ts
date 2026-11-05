import { http } from '@/shared/api/http-client'
import { parseWith } from '@/shared/api/errors'
import { CartResponseSchema, QuoteResponseSchema, type AddCartItemInput, type NetworkId } from '@/shared/contracts'

const cart = (data: unknown) => parseWith(CartResponseSchema, data).cart

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await http.get('/cart', { signal })
  return cart(data)
}

export async function addCartItem(input: AddCartItemInput) {
  const { data } = await http.post('/cart/items', input)
  return cart(data)
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data } = await http.patch(`/cart/items/${itemId}`, { quantity })
  return cart(data)
}

export async function removeCartItem(itemId: string) {
  const { data } = await http.delete(`/cart/items/${itemId}`)
  return cart(data)
}

export async function applyCoupon(code: string) {
  const { data } = await http.put('/cart/coupon', { code })
  return cart(data)
}

export async function removeCoupon() {
  const { data } = await http.delete('/cart/coupon')
  return cart(data)
}

export async function acknowledgePrices() {
  const { data } = await http.post('/cart/acknowledge-prices')
  return cart(data)
}

export async function fetchQuote(network: NetworkId, signal?: AbortSignal) {
  const { data } = await http.post('/quote', { network }, { signal })
  return parseWith(QuoteResponseSchema, data).quote
}
