import Decimal from 'decimal.js'
import type {
  Cart,
  CartItem,
  EditionId,
  NetworkId,
  NftDetail,
  NftSummary,
  Order,
  Quote,
  QuoteIssue,
  User,
  Wallet,
  WalletConnection,
} from '@/shared/contracts'
import { formatEth } from '@/shared/lib/money'
import { NETWORK_LABELS, NETWORK_LONG_LABELS } from '@/shared/lib/labels'
import { ART, buildNftFixtures, NETWORK_FEES, type NftRecord } from '../fixtures/nfts'
import { COUPONS, USER_SEEDS, WALLET_SEEDS } from '../fixtures/accounts'
import { hashPassword, randomId } from './crypto'
import { bus } from '../realtime/bus'

const DB_KEY = 'kurio:mock-db'
const DB_VERSION = 4
export const QUOTE_TTL_MS = 10 * 60 * 1000
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000

export interface UserRecord extends User {
  passwordHash: string
  salt: string
}

export interface CartRecord {
  id: string
  key: string
  items: Array<{ id: string; nftId: string; editionId: EditionId; quantity: number; acceptedUnitPrice: string }>
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface QuoteRecord extends Quote {
  cartKey: string
  network: NetworkId
}

export interface OrderRecord extends Order {
  resolveAt: number
  outcome: 'confirmed' | 'rejected'
  cartKey: string
  cartItemIds: string[]
}

export interface DbState {
  version: number
  nfts: Record<string, NftRecord>
  users: Record<string, UserRecord>
  sessions: Record<string, { userId: string; expiresAt: number }>
  carts: Record<string, CartRecord>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  connections: Record<string, WalletConnection | null>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, { hash: string; orderId: string }>
  eventSeq: number
}

let state: DbState | null = null

async function seed(): Promise<DbState> {
  const nfts = Object.fromEntries(buildNftFixtures().map((n) => [n.id, n]))
  const users: Record<string, UserRecord> = {}
  const favorites: Record<string, string[]> = {}
  for (const u of USER_SEEDS) {
    const { hash, salt } = await hashPassword(u.password, `salt-${u.id}`)
    users[u.id] = {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      ensName: u.ensName,
      walletAlias: u.walletAlias,
      avatarUrl: null,
      passwordHash: hash,
      salt,
    }
    favorites[u.id] = [...u.favorites]
  }
  const wallets: Record<string, Wallet[]> = {}
  for (const w of WALLET_SEEDS) {
    const { userId, ...rest } = w
    ;(wallets[userId] ??= []).push({ ...rest, updatedAt: '2026-10-01T12:00:00.000Z' })
  }
  return {
    version: DB_VERSION,
    nfts,
    users,
    sessions: {},
    carts: {},
    favorites,
    wallets,
    connections: {},
    quotes: {},
    orders: {},
    idempotency: {},
    eventSeq: 0,
  }
}

export async function initDb() {
  if (state) return state
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version === DB_VERSION) state = parsed
    }
  } catch {}
  if (!state) {
    state = await seed()
    persist()
  }
  return state
}

export async function resetDb() {
  state = await seed()
  persist()
}

export function db(): DbState {
  if (!state) throw new Error('Mock DB não inicializado')
  return state
}

export function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state))
  } catch {}
}

export const nowIso = () => new Date().toISOString()

export function nftPrice(n: NftRecord) {
  return n.editions.find((e) => e.id === '1-50')?.price ?? n.basePrice
}

export function isSoldOut(n: NftRecord) {
  return n.editions.every((e) => e.available === 0)
}

export function toSummary(n: NftRecord): NftSummary {
  return {
    id: n.id,
    name: n.name,
    tokenId: n.tokenId,
    image: ART[n.art].src,
    imageAlt: `${n.name}: ${ART[n.art].alt}`,
    price: nftPrice(n),
    compareAtPrice: n.compareAtPrice,
    category: n.category,
    network: n.network,
    badge: n.badge,
    soldOut: isSoldOut(n),
    listedAt: n.listedAt,
    version: n.version,
  }
}

export function toDetail(n: NftRecord): NftDetail {
  const s = db()
  const related = Object.values(s.nfts)
    .filter((o) => o.id !== n.id && o.collection.id === n.collection.id)
    .slice(0, 5)
  const fill = Object.values(s.nfts).filter((o) => o.id !== n.id && !related.includes(o))
  const rel = [...related, ...fill].slice(0, 5)
  return {
    ...toSummary(n),
    images: n.gallery.map((k, i) => ({
      src: ART[k].src,
      alt: i === 0 ? `${n.name}: ${ART[k].alt}` : `Variação ${i + 1} da coleção ${n.collection.name}: ${ART[k].alt}`,
    })),
    description: `Um colecionável digital finalizado à mão da coleção ${n.collection.name}, verificado na ${NETWORK_LABELS[n.network]}, com arte desbloqueável e acesso para colecionadores.`,
    longDescription: `${n.name} é uma obra digital 1/50 finalizada à mão da coleção ${n.collection.name}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${n.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    collection: n.collection,
    attributes: n.attributes,
    rating: Math.round(n.rating * 10) / 10,
    reviewCount: n.reviewCount,
    creator: { name: n.creator, royaltyPercent: 5 },
    contract: { address: `0x7A42${n.tokenId.replace('#', '')}C3d9F01b5E7a2D4c6B8e0F19E8`, standard: 'ERC-721' },
    networkLabel: NETWORK_LONG_LABELS[n.network],
    editions: n.editions.map((e) => ({ ...e })),
    related: rel.map(toSummary),
  }
}

export function nextEventId() {
  const s = db()
  s.eventSeq += 1
  return `evt_${String(s.eventSeq).padStart(6, '0')}_${randomId(4)}`
}

export function mutateNft(nftId: string, change: (n: NftRecord) => void, reason: 'price_changed' | 'availability_changed' | 'sold_out') {
  const n = db().nfts[nftId]
  if (!n) return null
  change(n)
  n.version += 1
  persist()
  bus.emit({
    kind: 'nft',
    event: {
      eventId: nextEventId(),
      type: 'nft.updated',
      resource: { type: 'nft', id: n.id },
      version: n.version,
      occurredAt: nowIso(),
      data: {
        nftId: n.id,
        price: nftPrice(n),
        soldOut: isSoldOut(n),
        editions: n.editions.map((e) => ({ id: e.id, price: e.price, available: e.available })),
        reason: isSoldOut(n) ? 'sold_out' : reason,
      },
    },
  })
  return n
}

export function publicUser(u: UserRecord): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    ensName: u.ensName,
    walletAlias: u.walletAlias,
    avatarUrl: u.avatarUrl,
  }
}

export function createSession(userId: string, ttl = SESSION_TTL_MS) {
  const token = `tok_${randomId(24)}`
  const expiresAt = Date.now() + ttl
  db().sessions[token] = { userId, expiresAt }
  persist()
  return { token, expiresAt: new Date(expiresAt).toISOString() }
}

export function cartKeyFor(userId: string | null, guestId: string | null) {
  if (userId) return `user:${userId}`
  return `guest:${guestId ?? 'anonymous'}`
}

export function getCart(key: string): CartRecord {
  const s = db()
  if (!s.carts[key]) {
    s.carts[key] = { id: `cart_${randomId(8)}`, key, items: [], couponCode: null, version: 1, updatedAt: nowIso() }
  }
  return s.carts[key]
}

export function touchCart(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
  persist()
}

export function edition(n: NftRecord, editionId: EditionId) {
  return n.editions.find((e) => e.id === editionId) ?? null
}

export function toCartItem(item: CartRecord['items'][number]): CartItem | null {
  const n = db().nfts[item.nftId]
  if (!n) return null
  const e = edition(n, item.editionId)
  if (!e) return null
  return {
    id: item.id,
    nftId: n.id,
    editionId: e.id,
    editionLabel: e.label,
    name: n.name,
    tokenId: n.tokenId,
    image: ART[n.art].src,
    imageAlt: `${n.name}: ${ART[n.art].alt}`,
    quantity: item.quantity,
    unitPrice: e.price,
    acceptedUnitPrice: item.acceptedUnitPrice,
    available: e.available,
    maxPerOrder: e.maxPerOrder,
    nftVersion: n.version,
  }
}

export function toCart(cart: CartRecord): Cart {
  return {
    id: cart.id,
    items: cart.items.map(toCartItem).filter((i): i is CartItem => i !== null),
    couponCode: cart.couponCode,
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

export function findCoupon(code: string) {
  return COUPONS.find((c) => c.code === code.trim().toUpperCase()) ?? null
}

export function computeQuote(cart: CartRecord, network: NetworkId = 'ethereum'): QuoteRecord {
  const issues: QuoteIssue[] = []
  const lines: Quote['lines'] = []
  let subtotal = new Decimal(0)

  for (const raw of cart.items) {
    const item = toCartItem(raw)
    if (!item) continue
    const lineTotal = new Decimal(item.unitPrice).times(item.quantity)
    subtotal = subtotal.plus(lineTotal)
    lines.push({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      tokenId: item.tokenId,
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: lineTotal.toFixed(),
    })
    if (item.available === 0) {
      issues.push({ code: 'sold_out', itemId: item.id, message: `${item.name} (${item.editionLabel}) esgotou.` })
    } else if (item.quantity > item.available) {
      issues.push({
        code: 'insufficient_availability',
        itemId: item.id,
        message: `Restam apenas ${item.available} unidade(s) de ${item.name} (${item.editionLabel}).`,
      })
    }
    if (item.unitPrice !== item.acceptedUnitPrice) {
      issues.push({
        code: 'price_changed',
        itemId: item.id,
        message: `O preço de ${item.name} mudou de ${formatEth(item.acceptedUnitPrice)} para ${formatEth(item.unitPrice)}.`,
      })
    }
  }

  let discount = new Decimal(0)
  let coupon: Quote['coupon'] = null
  if (cart.couponCode) {
    const c = findCoupon(cart.couponCode)
    if (!c) {
      issues.push({ code: 'coupon_invalid', itemId: null, message: 'O cupom aplicado não é mais válido.' })
    } else if (Date.parse(c.expiresAt) < Date.now()) {
      issues.push({ code: 'coupon_expired', itemId: null, message: `O cupom ${c.code} expirou.` })
    } else {
      coupon = { code: c.code, label: c.label, percent: c.percent }
      discount = subtotal.times(c.percent).dividedBy(100).toDecimalPlaces(6, Decimal.ROUND_DOWN)
    }
  }

  const networkFee = lines.length > 0 ? new Decimal(NETWORK_FEES[network]) : new Decimal(0)
  const total = subtotal.minus(discount).plus(networkFee)
  const createdAt = Date.now()

  return {
    id: `qte_${randomId(10)}`,
    cartKey: cart.key,
    network,
    cartVersion: cart.version,
    lines,
    subtotal: subtotal.toFixed(),
    discount: discount.toFixed(),
    coupon,
    networkFee: networkFee.toFixed(),
    total: total.toFixed(),
    currency: 'ETH',
    issues,
    expiresAt: new Date(createdAt + QUOTE_TTL_MS).toISOString(),
    createdAt: new Date(createdAt).toISOString(),
  }
}

export function publicQuote(q: QuoteRecord): Quote {
  const { cartKey: _k, network: _n, ...rest } = q
  return rest
}

export function sameQuoteValues(a: Quote, b: Quote) {
  if (a.total !== b.total || a.subtotal !== b.subtotal || a.discount !== b.discount || a.networkFee !== b.networkFee) {
    return false
  }
  if (a.lines.length !== b.lines.length) return false
  return a.lines.every((l, i) => {
    const o = b.lines[i]
    return o && o.itemId === l.itemId && o.quantity === l.quantity && o.unitPrice === l.unitPrice
  })
}

export function publicOrder(o: OrderRecord): Order {
  const { resolveAt: _r, outcome: _o, cartKey: _c, cartItemIds: _i, ...rest } = o
  return rest
}

function publishOrder(o: OrderRecord) {
  bus.emit({
    kind: 'order',
    event: {
      eventId: nextEventId(),
      type: 'order.updated',
      resource: { type: 'order', id: o.id },
      version: o.version,
      occurredAt: nowIso(),
      data: { userId: o.userId, order: publicOrder(o) },
    },
  })
}

function txHash() {
  const hex = '0123456789abcdef'
  let s = '0x'
  for (let i = 0; i < 64; i++) s += hex[Math.floor(Math.random() * 16)]
  return s
}

export function settleDueOrders() {
  const s = db()
  const now = Date.now()
  for (const o of Object.values(s.orders)) {
    if (o.status !== 'pending' || o.resolveAt > now) continue

    let outcome = o.outcome
    let reason: string | null = outcome === 'rejected' ? 'O pagamento foi recusado pela carteira.' : null

    if (outcome === 'confirmed') {
      const short = o.lines.find((l) => {
        const e = s.nfts[l.nftId] && edition(s.nfts[l.nftId], l.editionId)
        return !e || e.available < l.quantity
      })
      if (short) {
        outcome = 'rejected'
        reason = `Disponibilidade insuficiente para ${short.name} no momento da liquidação.`
      }
    }

    o.status = outcome
    o.version += 1
    o.updatedAt = nowIso()
    o.rejectionReason = reason

    if (outcome === 'confirmed') {
      o.transactionHash = txHash()
      o.explorerUrl = `https://etherscan.io/tx/${o.transactionHash}`
      const cart = s.carts[o.cartKey]
      for (const l of o.lines) {
        mutateNft(
          l.nftId,
          (n) => {
            const e = edition(n, l.editionId)
            if (e) e.available = Math.max(0, e.available - l.quantity)
          },
          'availability_changed',
        )
        if (cart) {
          const item = cart.items.find((i) => i.nftId === l.nftId && i.editionId === l.editionId)
          if (item) item.quantity -= l.quantity
        }
      }
      if (cart) {
        cart.items = cart.items.filter((i) => i.quantity > 0)
        if (o.couponCode && cart.couponCode === o.couponCode) cart.couponCode = null
        touchCart(cart)
      }
    }
    persist()
    publishOrder(o)
  }
}

export { publishOrder }
