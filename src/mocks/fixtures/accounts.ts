import type { NetworkId, WalletType } from '@/shared/contracts'

export const FIXTURE_PASSWORD = 'Kurio@2026'

export interface UserSeed {
  id: string
  username: string
  displayName: string
  email: string
  ensName: string | null
  walletAlias: string | null
  password: string
  favorites: string[]
}

export const USER_SEEDS: UserSeed[] = [
  {
    id: 'usr_ana',
    username: 'ana.colecionadora',
    displayName: 'Ana Souza',
    email: 'ana@kurio.dev',
    ensName: 'ana-kurio',
    walletAlias: 'Principal',
    password: FIXTURE_PASSWORD,
    favorites: ['emerald-ape-042', 'ivory-baron-088'],
  },
  {
    id: 'usr_bruno',
    username: 'bruno.nft',
    displayName: 'Bruno Lima',
    email: 'bruno@kurio.dev',
    ensName: 'bruno-lima',
    walletAlias: 'Cofre',
    password: FIXTURE_PASSWORD,
    favorites: ['golden-beat-207'],
  },
]

export interface WalletSeed {
  id: string
  userId: string
  slot: 'primary' | 'secondary'
  displayName: string
  alias: string
  network: NetworkId
  profileName: string
  address: string
  secondaryAddress: string
  walletType: WalletType
  referralCode: string
  email: string
  ensName: string
}

export const WALLET_SEEDS: WalletSeed[] = [
  {
    id: 'wal_ana_primary',
    userId: 'usr_ana',
    slot: 'primary',
    displayName: 'Ana Souza',
    alias: 'Principal',
    network: 'ethereum',
    profileName: 'ana.colecionadora',
    address: '0xA91F4c2b7D3e8a6F1b0C9d5E2f7A3b4C6d8EE82C',
    secondaryAddress: '',
    walletType: 'metamask',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.dev',
    ensName: 'ana-kurio',
  },
  {
    id: 'wal_ana_secondary',
    userId: 'usr_ana',
    slot: 'secondary',
    displayName: 'Ana Souza',
    alias: 'Reserva',
    network: 'polygon',
    profileName: 'ana.colecionadora',
    address: '0x5B3e9C1d2A7f4E8b6D0c3F9a1E5d7B2c4A6f8D10',
    secondaryAddress: 'nova.kurio.eth',
    walletType: 'walletconnect',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.dev',
    ensName: 'nova-kurio',
  },
  {
    id: 'wal_bruno_primary',
    userId: 'usr_bruno',
    slot: 'primary',
    displayName: 'Bruno Lima',
    alias: 'Cofre',
    network: 'ethereum',
    profileName: 'bruno.nft',
    address: '0x7C2d4E6f8A0b1C3d5E7f9A2b4C6d8E0f1A3b5C7D',
    secondaryAddress: '',
    walletType: 'coinbase',
    referralCode: 'KURIO-BRU',
    email: 'bruno@kurio.dev',
    ensName: 'bruno-lima',
  },
]

export interface CouponRecord {
  code: string
  label: string
  percent: number
  expiresAt: string
}

export const COUPONS: CouponRecord[] = [
  { code: 'KURIO10', label: 'Desconto do lançamento', percent: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'GENESIS20', label: 'Lançamento gênesis', percent: 20, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'VERAO25', label: 'Campanha de verão', percent: 25, expiresAt: '2025-03-20T23:59:59.000Z' },
]
