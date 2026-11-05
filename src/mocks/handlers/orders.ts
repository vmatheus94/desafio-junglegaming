import { CreateOrderInputSchema } from '@/shared/contracts'
import {
  cartKeyFor,
  computeQuote,
  db,
  edition,
  getCart,
  mutateNft,
  nowIso,
  persist,
  publicOrder,
  publicQuote,
  sameQuoteValues,
  settleDueOrders,
  type OrderRecord,
} from '../db'
import { randomId, stableStringify } from '../db/crypto'
import { firstTime, getScenario, is } from '../scenarios'
import { WALLET_TYPE_LABELS } from '@/shared/lib/labels'
import { API, apiError, authenticate, delay, http, HttpResponse, readJson, scenario, validationError } from './utils'
import Decimal from 'decimal.js'

export const ordersHandlers = [
  http.post(
    `${API}/orders`,
    scenario('orders', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const key = request.headers.get('Idempotency-Key')
      if (!key || key.length < 8) {
        return apiError(400, 'validation_error', 'Cabeçalho Idempotency-Key é obrigatório.')
      }
      const body = await readJson(request)
      const parsed = CreateOrderInputSchema.safeParse(body)
      if (!parsed.success) return validationError(parsed.error)
      const input = parsed.data
      const uid = auth.user.id
      const idemKey = `${uid}:${key}`
      const hash = stableStringify(input)

      settleDueOrders()
      const previous = db().idempotency[idemKey]
      if (previous) {
        if (previous.hash !== hash) {
          return apiError(409, 'idempotency_conflict', 'Esta tentativa de compra já foi usada com outros dados.')
        }
        const order = db().orders[previous.orderId]
        return HttpResponse.json({ order: publicOrder(order) }, { status: 200 })
      }

      const cart = getCart(cartKeyFor(uid, null))

      if (is('price-change-at-checkout') && cart.items[0] && firstTime('price-change')) {
        const target = cart.items[0]
        mutateNft(
          target.nftId,
          (n) => {
            const e = edition(n, target.editionId)
            if (e) e.price = new Decimal(e.price).plus('0.15').toFixed()
          },
          'price_changed',
        )
      }
      if (is('sold-out-at-checkout') && cart.items[0] && firstTime('sold-out')) {
        const target = cart.items[0]
        mutateNft(
          target.nftId,
          (n) => {
            const e = edition(n, target.editionId)
            if (e) e.available = 0
          },
          'availability_changed',
        )
      }

      const quote = db().quotes[input.quoteId]
      const fresh = computeQuote(cart, input.network)
      db().quotes[fresh.id] = fresh
      persist()

      const outdated =
        !quote ||
        quote.cartKey !== cart.key ||
        quote.network !== input.network ||
        Date.parse(quote.expiresAt) < Date.now() ||
        quote.cartVersion !== cart.version ||
        !sameQuoteValues(quote, fresh) ||
        fresh.issues.length > 0

      if (cart.items.length === 0) {
        return apiError(409, 'conflict', 'Seu carrinho está vazio.')
      }
      if (outdated) {
        return apiError(409, 'quote_outdated', 'Os valores do pedido mudaram. Revise e confirme novamente.', {
          details: { quote: publicQuote(fresh) },
        })
      }

      const wallet = (db().wallets[uid] ?? []).find((w) => w.id === input.walletId)
      if (!wallet) return apiError(404, 'not_found', 'Carteira não encontrada.')
      const connection = db().connections[uid]
      if (!connection || connection.walletId !== wallet.id || connection.network !== input.network) {
        return apiError(409, 'wallet_not_connected', 'Conecte a carteira selecionada antes de confirmar.')
      }

      const scenarioCfg = getScenario()
      const createdAt = nowIso()
      const order: OrderRecord = {
        id: `ord_${randomId(10)}`,
        userId: uid,
        status: 'pending',
        version: 1,
        lines: quote.lines.map(({ itemId: _i, ...l }) => {
          const n = db().nfts[l.nftId]
          return { ...l, editionLabel: (n && edition(n, l.editionId)?.label) || l.editionId }
        }),
        subtotal: quote.subtotal,
        discount: quote.discount,
        couponCode: quote.coupon?.code ?? null,
        networkFee: quote.networkFee,
        total: quote.total,
        wallet: { id: wallet.id, type: connection.provider, label: WALLET_TYPE_LABELS[connection.provider], address: wallet.address },
        network: input.network,
        buyer: { displayName: input.buyer.displayName, username: input.buyer.username, email: input.buyer.email },
        transactionHash: null,
        explorerUrl: null,
        rejectionReason: null,
        createdAt,
        updatedAt: createdAt,
        resolveAt: Date.now() + scenarioCfg.paymentDelayMs,
        outcome: is('payment-declined') ? 'rejected' : 'confirmed',
        cartKey: cart.key,
        cartItemIds: quote.lines.map((l) => l.itemId),
      }
      db().orders[order.id] = order
      db().idempotency[idemKey] = { hash, orderId: order.id }
      persist()

      if (is('order-timeout') && firstTime('order-timeout')) {
        await delay('infinite')
      }

      return HttpResponse.json({ order: publicOrder(order) }, { status: 201 })
    }),
  ),

  http.get(
    `${API}/orders`,
    scenario('orders', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      settleDueOrders()
      const status = new URL(request.url).searchParams.get('status')
      const orders = Object.values(db().orders)
        .filter((o) => o.userId === auth.user.id && (!status || o.status === status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(publicOrder)
      return HttpResponse.json({ orders })
    }),
  ),

  http.get(
    `${API}/orders/:orderId`,
    scenario('orders', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      settleDueOrders()
      const order = db().orders[String(params.orderId)]
      if (!order) return apiError(404, 'not_found', 'Pedido não encontrado.')
      if (order.userId !== auth.user.id) return apiError(403, 'forbidden', 'Você não tem acesso a este pedido.')
      return HttpResponse.json({ order: publicOrder(order) })
    }),
  ),
]
