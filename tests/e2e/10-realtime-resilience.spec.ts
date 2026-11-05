import { test, expect, login, addToCart, goToReview } from '../support/fixtures'

test.describe('10 · Eventos duplicados/antigos, desconexão e retomada de pedido', () => {
  test('evento antigo é ignorado e duplicata não reaplica efeitos @desktop', async ({ page, mock }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => mock.socketConnections()).toBeGreaterThan(0)

    await mock.changePrice('emerald-ape-042', '1-50', '1.25')
    await expect(page.getByText('1.25 ETH').first()).toBeVisible()

    await mock.sendStaleNftEvent('emerald-ape-042')
    await page.waitForTimeout(500)
    await expect(page.getByText('999.99 ETH')).toHaveCount(0)
    await expect(page.getByText('1.25 ETH').first()).toBeVisible()

    await mock.replayLastEvent()
    await page.waitForTimeout(500)
    await expect(page.getByText('1.25 ETH').first()).toBeVisible()
  })

  test.describe('pedido pendente com queda de conexão', () => {
    test.use({ scenario: 'payment-slow' })
    test('após reconectar e recarregar, retoma o mesmo pedido sem nova compra', async ({ page, mock }) => {
      await login(page)
      await addToCart(page, 'emerald-ape-042')
      await goToReview(page)
      await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
      await expect(page.getByRole('heading', { name: 'Aguardando a confirmação do pagamento' })).toBeVisible()
      const orderUrl = page.url()

      await mock.blockSocket(true)
      await expect(page.getByText(/Conexão em tempo real interrompida/)).toBeVisible()

      await page.reload()
      await expect(page.getByRole('heading', { name: 'Aguardando a confirmação do pagamento' })).toBeVisible()
      await page.goto('/')
      await expect(page.getByRole('link', { name: 'Acompanhar pedido' })).toBeVisible()
      await page.getByRole('link', { name: 'Acompanhar pedido' }).click()
      await expect(page).toHaveURL(orderUrl)

      await mock.blockSocket(false)
      await mock.settleOrders()
      await expect(page.getByTestId('order-confirmation')).toBeVisible({ timeout: 10_000 })
      expect(await mock.orders()).toHaveLength(1)
    })
  })

  test('eventos de pedido de outra sessão não chegam ao usuário atual', async ({ page, mock }) => {
    await login(page, 'ana')
    await addToCart(page, 'golden-beat-207')
    await goToReview(page)
    await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\//)
    const orderUrl = page.url()

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/')
    await page.waitForFunction(() => !localStorage.getItem('kurio:session'))
    await login(page, 'bruno')
    await mock.settleOrders()
    await page.goto(orderUrl)
    await expect(page.getByText('Acesso negado')).toBeVisible()
  })
})
