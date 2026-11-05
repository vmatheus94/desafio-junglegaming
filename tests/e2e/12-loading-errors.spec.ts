import { test, expect } from '../support/fixtures'

test.describe('12 · Skeletons, feedback de falha e recuperação', () => {
  test.describe('rede lenta', () => {
    test.use({ scenario: 'slow' })
    test('skeletons com shimmer no catálogo, detalhe e resumo do carrinho', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('#catalogo .skeleton').filter({ visible: true }).first()).toBeVisible()
      await expect(page.locator('#catalogo article').first()).toBeVisible({ timeout: 10_000 })

      await page.goto('/nft/emerald-ape-042')
      await expect(page.locator('main[aria-busy="true"] .skeleton').filter({ visible: true }).first()).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('servidor indisponível', () => {
    test.use({ scenario: 'offline' })
    test('mostra erro e recupera com nova tentativa', async ({ page, mock }) => {
      await page.goto('/')
      await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({ timeout: 15_000 })
      await mock.setScenario('instant')
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page.locator('#catalogo article').first()).toBeVisible()
    })
  })

  test.describe('erro 500 no detalhe', () => {
    test.use({ scenario: 'server-error' })
    test('detalhe com falha e recuperação', async ({ page, mock }) => {
      await page.goto('/nft/emerald-ape-042')
      await expect(page.getByText('Não foi possível carregar este NFT')).toBeVisible({ timeout: 15_000 })
      await mock.setScenario('instant')
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    })
  })
})
