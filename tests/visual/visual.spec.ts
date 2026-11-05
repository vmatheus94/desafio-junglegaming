import { test, expect, login, addToCart } from '../support/fixtures'

const stable = async (page: import('@playwright/test').Page) => {
  await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important}' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await stable(page)
    await expect(page).toHaveScreenshot('inicio.png')
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await stable(page)
    await expect(page).toHaveScreenshot('detalhe.png')
  })

  test('carrinho', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314')
    await expect(page.getByTestId('summary-total')).toBeVisible()
    await stable(page)
    await expect(page).toHaveScreenshot('carrinho.png')
  })

  test('pagamento', async ({ page }) => {
    await login(page)
    await addToCart(page, 'emerald-ape-042')
    await page.goto('/pagamento')
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição', includeHidden: true })).toHaveValue('Ana Souza')
    await stable(page)
    await expect(page).toHaveScreenshot('pagamento.png')
  })
})
