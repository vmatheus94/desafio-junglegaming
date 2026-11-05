import { test, expect, login, addToCart, goToReview } from '../support/fixtures'

test.describe('07 · Falha de pagamento, clique repetido e timeout', () => {
  test.describe('pagamento recusado', () => {
    test.use({ scenario: 'payment-declined' })
    test('recusa preserva os itens no carrinho e não mostra confirmação', async ({ page, mock }) => {
      await login(page)
      await addToCart(page, 'emerald-ape-042')
      await goToReview(page)
      await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
      await mock.settleOrders()
      await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
      await expect(page.getByTestId('order-confirmation')).toHaveCount(0)
      await page.getByRole('link', { name: 'Ver carrinho' }).click()
      await expect(page.getByTestId('cart-item-emerald-ape-042')).toBeVisible()
    })
  })

  test('recusa da conexão da carteira não cria pedido', async ({ page, mock }) => {
    await login(page)
    await addToCart(page, 'emerald-ape-042')
    await page.goto('/pagamento')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.getByRole('button', { name: 'Recusar' }).click()
    await expect(page.getByRole('dialog').getByText('Você recusou a conexão na carteira.')).toBeVisible()
    expect(await mock.orders()).toHaveLength(0)
  })

  test('cliques repetidos geram um único pedido', async ({ page, mock }) => {
    await login(page)
    await addToCart(page, 'emerald-ape-042')
    await goToReview(page)
    const confirm = page.getByRole('button', { name: 'Confirmar e pagar' })
    await confirm.evaluate((el: HTMLButtonElement) => {
      el.click()
      el.click()
      el.click()
    })
    await expect(page).toHaveURL(/\/pedidos\//)
    expect(await mock.orders()).toHaveLength(1)
  })

  test.describe('timeout após criação do pedido', () => {
    test.use({ scenario: 'order-timeout' })
    test('nova tentativa com a mesma chave recupera o mesmo pedido', async ({ page, mock }) => {
      await page.clock.install()
      await login(page)
      await addToCart(page, 'emerald-ape-042')
      await goToReview(page)
      await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
      await expect(page.getByRole('button', { name: /Enviando pedido/ })).toBeVisible()
      await page.clock.fastForward(9_000)
      await page.clock.fastForward(2_000)
      await expect(page).toHaveURL(/\/pedidos\//, { timeout: 15_000 })
      const orders = await mock.orders()
      expect(orders).toHaveLength(1)
      expect(page.url()).toContain(orders[0].id)
    })
  })
})
