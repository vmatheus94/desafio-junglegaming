import type { CategoryId, EditionId, NetworkId } from '@/shared/contracts'
import { mulEth } from '@/shared/lib/money'

export const ART = {
  ape: { src: '/assets/nfts/emerald-ape.png', alt: 'Macaco de óculos redondos e jaqueta verde de colégio' },
  nomad: { src: '/assets/nfts/sage-nomad.png', alt: 'Gorila grisalho de chapéu bucket verde e moletom roxo' },
  baron: { src: '/assets/nfts/ivory-baron.png', alt: 'Gorila de terno bege e gola alta verde-escura' },
  beat: { src: '/assets/nfts/golden-beat.png', alt: 'Orangotango com fones de ouvido verdes e jaqueta creme' },
} as const

type ArtKey = keyof typeof ART

export interface EditionRecord {
  id: EditionId
  label: string
  supply: number | null
  available: number
  price: string
  maxPerOrder: number
}

export interface NftRecord {
  id: string
  name: string
  tokenId: string
  art: ArtKey
  gallery: ArtKey[]
  category: CategoryId
  network: NetworkId
  collection: { id: string; name: string }
  attributes: string[]
  basePrice: string
  compareAtPrice: string | null
  badge: string | null
  rating: number
  reviewCount: number
  creator: string
  listedAt: string
  trendingScore: number
  editions: EditionRecord[]
  version: number
}

const COLLECTIONS: Record<ArtKey, { id: string; name: string }> = {
  ape: { id: 'kurio-apes', name: 'Kurio Apes' },
  nomad: { id: 'nomad-society', name: 'Nomad Society' },
  baron: { id: 'ivory-court', name: 'Ivory Court' },
  beat: { id: 'golden-frequencies', name: 'Golden Frequencies' },
}

const GALLERY: Record<ArtKey, ArtKey[]> = {
  ape: ['ape', 'nomad', 'beat', 'baron'],
  nomad: ['nomad', 'ape', 'baron', 'beat'],
  baron: ['baron', 'beat', 'ape', 'nomad'],
  beat: ['beat', 'baron', 'nomad', 'ape'],
}

function editions(basePrice: string, seed: number, opts: { soldOut?: boolean; oneOfOneSold?: boolean } = {}): EditionRecord[] {
  const avail = (n: number) => (opts.soldOut ? 0 : n)
  return [
    { id: '1-1', label: '1/1', supply: 1, available: opts.oneOfOneSold ? 0 : avail(1), price: mulEth(basePrice, 4), maxPerOrder: 1 },
    { id: '1-10', label: '1/10', supply: 10, available: avail(3 + (seed % 7)), price: mulEth(basePrice, 2), maxPerOrder: 10 },
    { id: '1-50', label: '1/50', supply: 50, available: avail(12 + (seed % 30)), price: basePrice, maxPerOrder: 10 },
    { id: 'open', label: 'ABERTA', supply: null, available: avail(999), price: mulEth(basePrice, '0.5'), maxPerOrder: 10 },
  ]
}

interface Seed {
  name: string
  art: ArtKey
  collection?: ArtKey
  price: string
  category: CategoryId
  network: NetworkId
  attributes: string[]
  compareAt?: string
  badge?: string
  creator?: string
  soldOut?: boolean
  oneOfOneSold?: boolean
  rating?: number
  reviews?: number
}

const FIGMA_GRID: Seed[] = [
  {
    name: 'Emerald Ape #042',
    art: 'ape',
    price: '1.19',
    category: 'digital-art',
    network: 'ethereum',
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    creator: 'Nova Sato',
    rating: 4.8,
    reviews: 19,
  },
  {
    name: 'Sage Nomad #009',
    art: 'nomad',
    price: '1.69',
    category: 'digital-art',
    network: 'ethereum',
    attributes: ['Chapéu bucket', 'Sálvia', 'Incomum'],
    badge: 'RARO',
  },
  {
    name: 'Neon Vessel #552',
    art: 'baron',
    price: '1.99',
    compareAt: '2.29',
    category: 'generative',
    network: 'ethereum',
    attributes: ['Terno', 'Neon', 'Lendário'],
  },
  {
    name: 'Cosmic Bloom #118',
    art: 'nomad',
    price: '1.29',
    category: '3d-art',
    network: 'polygon',
    attributes: ['Cósmico', 'Floral', 'Raro'],
  },
  {
    name: 'Violet Nomad #314',
    art: 'nomad',
    price: '1.39',
    category: 'collectibles',
    network: 'polygon',
    attributes: ['Violeta', 'Nômade', 'Comum'],
  },
  {
    name: 'Ivory Baron #088',
    art: 'baron',
    price: '1.79',
    category: 'collectibles',
    network: 'ethereum',
    attributes: ['Marfim', 'Barão', 'Épico'],
  },
  {
    name: 'Golden Beat #207',
    art: 'beat',
    price: '0.99',
    category: 'music',
    network: 'solana',
    attributes: ['Fones', 'Dourado', 'Incomum'],
  },
  {
    name: 'Golden Echo #133',
    art: 'beat',
    price: '0.89',
    category: 'music',
    network: 'solana',
    attributes: ['Eco', 'Dourado', 'Comum'],
    soldOut: true,
  },
  {
    name: 'Golden Signal #160',
    art: 'beat',
    price: '0.39',
    category: 'music',
    network: 'polygon',
    attributes: ['Sinal', 'Dourado', 'Comum'],
  },
]

const NAME_PARTS: Array<[string, ArtKey]> = [
  ['Jade Monarch', 'ape'],
  ['Copper Drifter', 'nomad'],
  ['Onyx Patron', 'baron'],
  ['Amber Rhythm', 'beat'],
  ['Moss Sentinel', 'ape'],
  ['Dune Wanderer', 'nomad'],
  ['Pearl Envoy', 'baron'],
  ['Saffron Pulse', 'beat'],
  ['Forest Regent', 'ape'],
  ['Lilac Pilgrim', 'nomad'],
  ['Bronze Curator', 'baron'],
  ['Honey Tempo', 'beat'],
  ['Verdant Chief', 'ape'],
  ['Mist Rover', 'nomad'],
  ['Sable Ambassador', 'baron'],
  ['Citrine Groove', 'beat'],
  ['Pine Oracle', 'ape'],
  ['Ash Voyager', 'nomad'],
  ['Cream Magnate', 'baron'],
  ['Topaz Cadence', 'beat'],
  ['Ivy Captain', 'ape'],
  ['Slate Nomad', 'nomad'],
  ['Linen Duke', 'baron'],
  ['Marigold Bass', 'beat'],
  ['Olive Scholar', 'ape'],
  ['Plum Traveler', 'nomad'],
  ['Ecru Consul', 'baron'],
]

const COLLECTION_KEYS: ArtKey[] = ['ape', 'nomad', 'baron', 'beat']

const CATEGORY_CYCLE: CategoryId[] = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
]
const NETWORK_CYCLE: NetworkId[] = ['ethereum', 'polygon', 'solana', 'ethereum', 'polygon']
const ATTRIBUTE_POOL = ['Raro', 'Comum', 'Incomum', 'Épico', 'Lendário', 'Animado', 'Holográfico', 'Vintage', 'Pastel', 'Neon']
const CREATORS = ['Nova Sato', 'Iris Moreau', 'Kai Okafor', 'Lia Brandão', 'Theo Varga', 'Maya Chen']

function generated(): Seed[] {
  return NAME_PARTS.map(([name, art], i) => {
    const num = String(((i * 37) % 900) + 100).padStart(3, '0')
    const cents = ((i * 53) % 1180) + 20
    const price = (cents / 100).toFixed(2)
    return {
      name: `${name} #${num}`,
      art,
      collection: COLLECTION_KEYS[Math.floor(i / 4) % COLLECTION_KEYS.length],
      price: i === 4 ? '12.30' : i === 9 ? '0.02' : price,
      category: CATEGORY_CYCLE[i % CATEGORY_CYCLE.length],
      network: NETWORK_CYCLE[i % NETWORK_CYCLE.length],
      attributes: [ATTRIBUTE_POOL[i % 10], ATTRIBUTE_POOL[(i + 3) % 10], ATTRIBUTE_POOL[(i + 7) % 10]],
      compareAt: i % 6 === 2 ? (cents / 100 + 0.3).toFixed(2) : undefined,
      badge: i % 5 === 1 ? 'RARO' : undefined,
      creator: CREATORS[i % CREATORS.length],
      soldOut: i === 13,
      oneOfOneSold: i % 3 === 0,
    }
  })
}

const BASE_DATE = Date.UTC(2026, 9, 30, 12, 0, 0)
const DAY = 24 * 60 * 60 * 1000

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildNftFixtures(): NftRecord[] {
  const all = [...FIGMA_GRID, ...generated()]
  return all.map((s, i) => {
    const num = s.name.split('#')[1] ?? String(i)
    return {
      id: slug(s.name),
      name: s.name,
      tokenId: `#${num.padStart(4, '0')}`,
      art: s.art,
      gallery: GALLERY[s.art],
      category: s.category,
      network: s.network,
      collection: COLLECTIONS[s.collection ?? s.art],
      attributes: s.attributes,
      basePrice: s.price,
      compareAtPrice: s.compareAt ?? null,
      badge: s.badge ?? null,
      rating: s.rating ?? 4 + ((i * 7) % 10) / 10,
      reviewCount: s.reviews ?? 5 + ((i * 11) % 40),
      creator: s.creator ?? 'Nova Sato',
      listedAt: new Date(BASE_DATE - i * DAY * 0.75).toISOString(),
      trendingScore: (i * 47) % 100,
      editions: editions(s.price, i, { soldOut: s.soldOut, oneOfOneSold: s.oneOfOneSold }),
      version: 1,
    }
  })
}

export const NETWORK_FEES: Record<NetworkId, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}
