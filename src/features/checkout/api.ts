import { z } from 'zod'
import { http } from '@/shared/api/http-client'
import { parseWith } from '@/shared/api/errors'
import {
  OrderResponseSchema,
  OrdersResponseSchema,
  WalletConnectionResponseSchema,
  WalletConnectionSchema,
  type CreateOrderInput,
  type NetworkId,
  type WalletType,
} from '@/shared/contracts'

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  const { data } = await http.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })
  return parseWith(OrderResponseSchema, data).order
}

export async function fetchOrder(orderId: string, signal?: AbortSignal) {
  const { data } = await http.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return parseWith(OrderResponseSchema, data).order
}

export async function fetchPendingOrders(signal?: AbortSignal) {
  const { data } = await http.get('/orders', { params: { status: 'pending' }, signal })
  return parseWith(OrdersResponseSchema, data).orders
}

export async function fetchWalletConnection(signal?: AbortSignal) {
  const { data } = await http.get('/wallets/connection', { signal })
  return parseWith(z.object({ connection: WalletConnectionSchema.nullable() }), data).connection
}

export async function connectWallet(walletId: string, network: NetworkId, provider: WalletType, approved: boolean) {
  const { data } = await http.post(`/wallets/${walletId}/connect`, { network, provider, approved })
  return parseWith(WalletConnectionResponseSchema, data).connection
}

export async function disconnectWallet() {
  await http.delete('/wallets/connection')
}
