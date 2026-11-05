import { z } from 'zod'
import { AddCartItemInputSchema, CouponInputSchema, NetworkIdSchema, UpdateCartItemInputSchema } from '@/shared/contracts'
import { cartKeyFor, computeQuote, db, edition, findCoupon, getCart, persist, publicQuote, toCart, touchCart, type CartRecord } from '../db'
import { randomId } from '../db/crypto'
import { API, apiError, authenticate, http, HttpResponse, readJson, scenario, validationError } from './utils'

function resolveCart(request: Request): CartRecord | Response {
  const guestId = request.headers.get('X-Guest-Cart')
  if (request.headers.get('Authorization')) {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return getCart(cartKeyFor(auth.user.id, null))
  }
  return getCart(cartKeyFor(null, guestId))
}

function cartResponse(cart: CartRecord, status = 200) {
  return HttpResponse.json({ cart: toCart(cart) }, { status })
}

function limitFor(nftId: string, editionId: string) {
  const n = db().nfts[nftId]
  const e = n ? edition(n, editionId as never) : null
  return e ? { available: e.available, max: Math.min(e.available, e.maxPerOrder), price: e.price, label: e.label } : null
}

export const cartHandlers = [
  http.get(
    `${API}/cart`,
    scenario('cart', ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      persist()
      return cartResponse(cart)
    }),
  ),

  http.post(
    `${API}/cart/items`,
    scenario('cart', async ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      const parsed = AddCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const { nftId, editionId, quantity } = parsed.data
      if (!db().nfts[nftId]) return apiError(404, 'not_found', 'NFT não encontrado.')
      const limit = limitFor(nftId, editionId)
      if (!limit || limit.available === 0) {
        return apiError(409, 'edition_unavailable', 'Esta edição está esgotada.')
      }
      const existing = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
      const next = (existing?.quantity ?? 0) + quantity
      if (next > limit.max) {
        return apiError(
          409,
          'insufficient_availability',
          `Você pode ter no máximo ${limit.max} unidade(s) da edição ${limit.label} no carrinho.`,
          {
            details: { available: limit.available, max: limit.max, inCart: existing?.quantity ?? 0 },
          },
        )
      }
      if (existing) {
        existing.quantity = next
        existing.acceptedUnitPrice = limit.price
      } else {
        cart.items.push({ id: `itm_${randomId(8)}`, nftId, editionId, quantity, acceptedUnitPrice: limit.price })
      }
      touchCart(cart)
      return cartResponse(cart, 201)
    }),
  ),

  http.patch(
    `${API}/cart/items/:itemId`,
    scenario('cart', async ({ request, params }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      const parsed = UpdateCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const item = cart.items.find((i) => i.id === params.itemId)
      if (!item) return apiError(404, 'not_found', 'Item não está mais no carrinho.')
      const limit = limitFor(item.nftId, item.editionId)
      if (!limit || limit.available === 0) return apiError(409, 'edition_unavailable', 'Esta edição está esgotada.')
      if (parsed.data.quantity > limit.max) {
        return apiError(409, 'insufficient_availability', `Disponível: no máximo ${limit.max} unidade(s).`, {
          details: { available: limit.available, max: limit.max },
        })
      }
      item.quantity = parsed.data.quantity
      touchCart(cart)
      return cartResponse(cart)
    }),
  ),

  http.delete(
    `${API}/cart/items/:itemId`,
    scenario('cart', ({ request, params }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      const before = cart.items.length
      cart.items = cart.items.filter((i) => i.id !== params.itemId)
      if (cart.items.length === before) return apiError(404, 'not_found', 'Item não está mais no carrinho.')
      touchCart(cart)
      return cartResponse(cart)
    }),
  ),

  http.put(
    `${API}/cart/coupon`,
    scenario('cart', async ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      const parsed = CouponInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const coupon = findCoupon(parsed.data.code)
      if (!coupon) {
        return apiError(422, 'coupon_invalid', 'Código promocional inválido.', { fields: { code: 'Código promocional inválido.' } })
      }
      if (Date.parse(coupon.expiresAt) < Date.now()) {
        return apiError(422, 'coupon_expired', `O cupom ${coupon.code} expirou.`, { fields: { code: `O cupom ${coupon.code} expirou.` } })
      }
      cart.couponCode = coupon.code
      touchCart(cart)
      return cartResponse(cart)
    }),
  ),

  http.delete(
    `${API}/cart/coupon`,
    scenario('cart', ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      cart.couponCode = null
      touchCart(cart)
      return cartResponse(cart)
    }),
  ),

  http.post(
    `${API}/cart/acknowledge-prices`,
    scenario('cart', ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      for (const item of cart.items) {
        const limit = limitFor(item.nftId, item.editionId)
        if (limit) item.acceptedUnitPrice = limit.price
      }
      touchCart(cart)
      return cartResponse(cart)
    }),
  ),

  http.post(
    `${API}/cart/merge`,
    scenario('cart', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const guestKey = cartKeyFor(null, request.headers.get('X-Guest-Cart'))
      const guest = db().carts[guestKey]
      const cart = getCart(cartKeyFor(auth.user.id, null))
      const adjusted: string[] = []
      if (guest && guest.items.length) {
        for (const g of guest.items) {
          const limit = limitFor(g.nftId, g.editionId)
          if (!limit || limit.max === 0) continue
          const existing = cart.items.find((i) => i.nftId === g.nftId && i.editionId === g.editionId)
          const wanted = (existing?.quantity ?? 0) + g.quantity
          const qty = Math.min(wanted, limit.max)
          if (qty < wanted) adjusted.push(g.nftId)
          if (existing) existing.quantity = qty
          else cart.items.push({ ...g, id: `itm_${randomId(8)}`, quantity: qty })
        }
        if (!cart.couponCode && guest.couponCode) cart.couponCode = guest.couponCode
        delete db().carts[guestKey]
        touchCart(cart)
      }
      persist()
      return HttpResponse.json({ cart: toCart(cart), adjusted })
    }),
  ),

  http.post(
    `${API}/quote`,
    scenario('quote', async ({ request }) => {
      const cart = resolveCart(request)
      if (cart instanceof Response) return cart
      const body = (await readJson<{ network?: string }>(request)) ?? {}
      const network = z.object({ network: NetworkIdSchema.optional() }).safeParse(body)
      if (!network.success) return validationError(network.error)
      const quote = computeQuote(cart, network.data.network ?? 'ethereum')
      db().quotes[quote.id] = quote
      const ids = Object.keys(db().quotes)
      if (ids.length > 50) ids.slice(0, ids.length - 50).forEach((id) => delete db().quotes[id])
      persist()
      return HttpResponse.json({ quote: publicQuote(quote) })
    }),
  ),
]
