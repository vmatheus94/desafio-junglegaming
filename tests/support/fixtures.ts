import { test as base, expect, type Page } from '@playwright/test'

export type ScenarioId =
  | 'default'
  | 'instant'
  | 'slow'
  | 'variable-latency'
  | 'empty-catalog'
  | 'offline'
  | 'flaky'
  | 'server-error'
  | 'short-session'
  | 'favorites-failure'
  | 'price-change-at-checkout'
  | 'sold-out-at-checkout'
  | 'order-timeout'
  | 'payment-declined'
  | 'payment-slow'

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno' },
} as const

export class Mock {
  constructor(private readonly page: Page) {}

  async ready() {
    await this.page.waitForFunction(() => !!window.__kurioMock)
  }

  async run<T>(fn: string, ...args: unknown[]): Promise<T> {
    await this.ready()
    return this.page.evaluate(
      ([path, a]) => {
        const parts = (path as string).split('.')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let target: any = window.__kurioMock
        for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]]
        return target[parts[parts.length - 1]](...(a as unknown[]))
      },
      [fn, args] as const,
    ) as Promise<T>
  }

  setScenario(id: ScenarioId) {
    return this.run('setScenario', id)
  }
  changePrice(nftId: string, editionId = '1-50', price?: string) {
    return this.run('changePrice', nftId, editionId, price)
  }
  changeAvailability(nftId: string, editionId = '1-50', available = 0) {
    return this.run('changeAvailability', nftId, editionId, available)
  }
  expireSessions() {
    return this.run('expireSessions')
  }
  settleOrders() {
    return this.run('settleOrdersNow')
  }
  orders() {
    return this.run<Array<{ id: string; userId: string; status: string; total: string }>>('orders')
  }
  socketConnections() {
    return this.run<number>('realtime.connections')
  }
  replayLastEvent() {
    return this.run<boolean>('realtime.replayLast')
  }
  sendStaleNftEvent(nftId: string) {
    return this.run<boolean>('realtime.sendStaleNftEvent', nftId)
  }
  blockSocket(blocked: boolean) {
    return this.run('realtime.setBlocked', blocked)
  }
}

export const test = base.extend<{ scenario: ScenarioId; mock: Mock }>({
  scenario: ['instant', { option: true }],
  page: async ({ page, scenario }, use) => {
    await page.addInitScript((s) => {
      if (!localStorage.getItem('kurio:mock-scenario')) localStorage.setItem('kurio:mock-scenario', s)
      localStorage.setItem('kurio:mock-panel', 'hidden')
    }, scenario)
    await use(page)
  },
  mock: async ({ page }, use) => {
    await use(new Mock(page))
  },
})

export { expect }

export function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

export async function login(page: Page, user: keyof typeof USERS = 'ana', redirect?: string) {
  const u = USERS[user]
  await page.goto(redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar')
  await page.getByRole('textbox', { name: 'E-mail' }).fill(u.email)
  await page.getByLabel('Senha', { exact: true }).fill(u.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/entrar/)
}

export async function addToCart(page: Page, nftId: string, quantity = 1) {
  await page.goto(`/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const inc = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true }).first()
  for (let i = 1; i < quantity; i++) await inc.click()
  const buy = isMobile(page)
    ? page.getByRole('button', { name: 'Comprar NFT', exact: true }).filter({ visible: true })
    : page.getByRole('button', { name: 'COMPRAR', exact: true })
  await buy.click()
  await expect(page).toHaveURL(/\/carrinho/)
  await expect(page.getByTestId(`cart-item-${nftId}`)).toBeVisible()
}

export async function goToReview(page: Page) {
  await page.goto('/pagamento')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const approve = page.getByRole('button', { name: 'Aprovar conexão' })
  if (await approve.isVisible().catch(() => false)) await approve.click()
  else {
    await approve
      .waitFor({ timeout: 2000 })
      .then(() => approve.click())
      .catch(() => undefined)
  }
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeVisible()
}
