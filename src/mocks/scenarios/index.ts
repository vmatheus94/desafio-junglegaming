export const SCENARIO_IDS = [
  'default',
  'instant',
  'slow',
  'variable-latency',
  'empty-catalog',
  'offline',
  'flaky',
  'server-error',
  'short-session',
  'favorites-failure',
  'price-change-at-checkout',
  'sold-out-at-checkout',
  'order-timeout',
  'payment-declined',
  'payment-slow',
] as const

export type ScenarioId = (typeof SCENARIO_IDS)[number]

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  latency: [number, number]
  paymentDelayMs: number
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  default: {
    id: 'default',
    label: 'Padrão',
    description: 'Latência realista (150–450 ms) e fluxos com sucesso.',
    latency: [150, 450],
    paymentDelayMs: 2500,
  },
  instant: {
    id: 'instant',
    label: 'Instantâneo',
    description: 'Sem latência. Usado nos testes automatizados.',
    latency: [0, 0],
    paymentDelayMs: 1200,
  },
  slow: {
    id: 'slow',
    label: 'Rede lenta',
    description: 'Todas as respostas levam ~2,5 s (skeletons visíveis).',
    latency: [2500, 2500],
    paymentDelayMs: 4000,
  },
  'variable-latency': {
    id: 'variable-latency',
    label: 'Latência variável',
    description: 'Consultas do catálogo alternam 1,6 s e 0,2 s: respostas chegam fora de ordem.',
    latency: [200, 1600],
    paymentDelayMs: 2500,
  },
  'empty-catalog': {
    id: 'empty-catalog',
    label: 'Catálogo vazio',
    description: 'A listagem de NFTs não retorna resultados.',
    latency: [150, 300],
    paymentDelayMs: 2500,
  },
  offline: {
    id: 'offline',
    label: 'Sem conexão',
    description: 'Todas as chamadas REST falham com erro de rede.',
    latency: [0, 0],
    paymentDelayMs: 2500,
  },
  flaky: {
    id: 'flaky',
    label: 'Instável (1ª falha)',
    description: 'A primeira chamada de cada recurso falha com 503; a nova tentativa funciona.',
    latency: [150, 300],
    paymentDelayMs: 2500,
  },
  'server-error': {
    id: 'server-error',
    label: 'Erro 500',
    description: 'Catálogo e detalhe respondem 500 até trocar de cenário.',
    latency: [100, 200],
    paymentDelayMs: 2500,
  },
  'short-session': {
    id: 'short-session',
    label: 'Sessão curta',
    description: 'Sessões expiram 45 s após o login.',
    latency: [100, 250],
    paymentDelayMs: 2500,
  },
  'favorites-failure': {
    id: 'favorites-failure',
    label: 'Falha em favoritos',
    description: 'Incluir/remover favorito responde 500 (testa rollback otimista).',
    latency: [300, 300],
    paymentDelayMs: 2500,
  },
  'price-change-at-checkout': {
    id: 'price-change-at-checkout',
    label: 'Preço muda na compra',
    description: 'Na 1ª confirmação, o preço de um item sobe e o pedido exige nova confirmação.',
    latency: [150, 300],
    paymentDelayMs: 2500,
  },
  'sold-out-at-checkout': {
    id: 'sold-out-at-checkout',
    label: 'Edição esgota na compra',
    description: 'Na 1ª confirmação, a edição de um item esgota.',
    latency: [150, 300],
    paymentDelayMs: 2500,
  },
  'order-timeout': {
    id: 'order-timeout',
    label: 'Timeout no pedido',
    description: 'O pedido é criado mas a 1ª resposta nunca chega; a nova tentativa recupera o mesmo pedido.',
    latency: [150, 300],
    paymentDelayMs: 2500,
  },
  'payment-declined': {
    id: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'Pedidos são recusados pela carteira.',
    latency: [150, 300],
    paymentDelayMs: 2000,
  },
  'payment-slow': {
    id: 'payment-slow',
    label: 'Pagamento demorado',
    description: 'O pedido fica pendente por 20 s (teste de desconexão e retomada).',
    latency: [150, 300],
    paymentDelayMs: 20000,
  },
}

const STORAGE_KEY = 'kurio:mock-scenario'

function isScenarioId(v: string | null | undefined): v is ScenarioId {
  return !!v && (SCENARIO_IDS as readonly string[]).includes(v)
}

function readInitialScenario(): ScenarioId {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('scenario')
    if (isScenarioId(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl)
      return fromUrl
    }
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isScenarioId(saved)) return saved
  } catch {}
  const env = import.meta.env.VITE_MOCK_SCENARIO
  return isScenarioId(env) ? env : 'default'
}

let active: ScenarioId = 'default'
let requestCounter = 0
const onceFlags = new Map<string, number>()
let rng = mulberry32(42)

export function initScenario() {
  active = readInitialScenario()
  resetCounters()
}

export function getScenario(): Scenario {
  return SCENARIOS[active]
}

export function setScenario(id: ScenarioId) {
  active = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {}
  resetCounters()
}

export function resetCounters() {
  requestCounter = 0
  onceFlags.clear()
  rng = mulberry32(42)
}

export function is(id: ScenarioId) {
  return active === id
}

export function firstTime(key: string) {
  const n = onceFlags.get(key) ?? 0
  onceFlags.set(key, n + 1)
  return n === 0
}

export function nextLatency(resource: string): number {
  requestCounter += 1
  const s = getScenario()
  if (active === 'variable-latency' && resource === 'catalog') {
    return requestCounter % 2 === 1 ? 1600 : 200
  }
  const [min, max] = s.latency
  if (min === max) return min
  return Math.round(min + rng() * (max - min))
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
