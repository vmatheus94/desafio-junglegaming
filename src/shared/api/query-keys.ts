import type { CatalogQuery } from '@/shared/contracts'

export const queryKeys = {
  catalog: (params: CatalogQuery) => ['catalog', params] as const,
  catalogAll: ['catalog'] as const,
  nft: (id: string) => ['nft', id] as const,
  nftAll: ['nft'] as const,

  session: (token: string | null) => ['session', token] as const,

  cart: (owner: string) => ['cart', owner] as const,
  cartAll: ['cart'] as const,
  quote: (owner: string, network: string) => ['quote', owner, network] as const,
  quoteAll: ['quote'] as const,

  user: (userId: string) => ['user', userId] as const,
  userAll: ['user'] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  walletConnection: (userId: string) => ['user', userId, 'wallet-connection'] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
  ordersPending: (userId: string) => ['user', userId, 'orders', 'pending'] as const,
}
