import { test, expect, login, addToCart, goToReview } from '../support/fixtures'

test.describe('09 · Preço/disponibilidade alterados via Socket.IO durante o checkout', () => {
  test('alteração de preço com o carrinho aberto atualiza o resumo', async ({ page, mock }) => {
    await addToCart(page, 'emerald-ape-042')
    await expect.poll(() => mock.socketConnections()).toBeGreaterThan(0)
    await mock.changePrice('emerald-ape-042', '1-50', '1.50')
    await expect(page.getByText(/O preço de Emerald Ape #042 \(1\/50\) mudou para 1.50 ETH/).first()).toBeVisible()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.50 ETH')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
    await page.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
  })

  test('checkout bloqueia a confirmação com cotação desatualizada', async ({ page, mock }) => {
    await login(page)
    await addToCart(page, 'emerald-ape-042')
    await goToReview(page)
    await expect(page.getByTestId('review-total')).toHaveText('1.206 ETH')
    await expect.poll(() => mock.socketConnections()).toBeGreaterThan(0)

    await mock.changePrice('emerald-ape-042', '1-50', '1.40')
    await expect(page.getByText('Os valores mudaram desde a sua revisão.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar e pagar' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(page.getByTestId('review-total')).toHaveText('1.416 ETH')
    await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
    await expect(page).toHaveURL(/\/pedidos\//)
  })

  test.describe('edição esgota na confirmação', () => {
    test.use({ scenario: 'sold-out-at-checkout' })
    test('o servidor recusa a cotação e o usuário precisa ajustar o carrinho', async ({ page, mock }) => {
      await login(page)
      await addToCart(page, 'emerald-ape-042')
      await goToReview(page)
      await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
      await expect(page.getByText('Os valores mudaram desde a sua revisão.')).toBeVisible()
      await expect(page.getByText(/esgotou/).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
      expect(await mock.orders()).toHaveLength(0)
    })
  })
})
