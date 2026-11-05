import { test, expect, login, addToCart, goToReview } from '../support/fixtures'

test.describe('06 · Compra completa do catálogo ao recibo', () => {
  test('do catálogo ao recibo confirmado, com snapshot imutável', async ({ page, mock }) => {
    await login(page)
    await page.goto('/')
    await page.locator('#catalogo').getByRole('link', { name: 'Emerald Ape #042' }).click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
    await addToCart(page, 'emerald-ape-042', 2)
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/pagamento/)
    await goToReview(page)
    await expect(page.getByTestId('review-total')).toHaveText('2.396 ETH')
    await page.getByRole('button', { name: 'Confirmar e pagar' }).click()

    await expect(page).toHaveURL(/\/pedidos\//)
    await mock.settleOrders()
    const receipt = page.getByTestId('order-confirmation')
    await expect(receipt).toBeVisible()
    await expect(receipt.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')

    await mock.changePrice('emerald-ape-042', '1-50', '9.99')
    await page.reload()
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')

    await page.goto('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    expect((await mock.orders()).filter((o) => o.status === 'confirmed')).toHaveLength(1)
  })

  test('validação dos campos do pagamento @desktop', async ({ page }) => {
    await login(page)
    await addToCart(page, 'golden-beat-207')
    await page.goto('/pagamento')
    const email = page.getByRole('textbox', { name: 'E-mail' })
    await email.fill('invalido')
    await page.getByRole('textbox', { name: 'Código de indicação' }).fill('')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('E-mail inválido')).toBeVisible()
    await expect(page.getByText('Informe o código de indicação')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
