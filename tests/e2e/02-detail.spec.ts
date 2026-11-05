import { test, expect } from '../support/fixtures'

test.describe('02 · Detalhe do NFT: acesso direto e recurso inexistente', () => {
  test('acesso direto mostra galeria, informações e edição', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042?edicao=1-10')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Edição 1\/10/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('2.38 ETH').first()).toBeVisible()
    await expect(page.getByText('Coleção:')).toBeVisible()
  })

  test('NFT inexistente exibe estado de não encontrado', async ({ page }) => {
    await page.goto('/nft/nao-existe-999')
    await expect(page.getByText('NFT não encontrado')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o catálogo' })).toBeVisible()
  })

  test('edição esgotada fica indisponível para compra', async ({ page }) => {
    await page.goto('/nft/golden-echo-133')
    await expect(page.getByText(/está esgotada/)).toBeVisible()
    const buy = page
      .getByRole('button', { name: /ESGOTADO|Esgotado/ })
      .filter({ visible: true })
      .first()
    await expect(buy).toBeDisabled()
  })

  test('respeita o limite de quantidade por pedido', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042?edicao=1-1')
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true }).first()
    await expect(plus).toBeDisabled()
  })

  test('rota inexistente mostra página 404', async ({ page }) => {
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByText('Página não encontrada')).toBeVisible()
  })
})
