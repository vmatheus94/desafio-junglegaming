import { test, expect, login } from '../support/fixtures'

test.describe('04 · Favoritos', () => {
  test('visitante é levado ao login ao favoritar', async ({ page }) => {
    await page.goto('/nft/sage-nomad-009')
    await page
      .getByRole('button', { name: /Favoritar Sage Nomad/ })
      .filter({ visible: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
  })

  test('favoritar persiste para o usuário autenticado', async ({ page }) => {
    await login(page, 'ana', '/nft/sage-nomad-009')
    const toggle = page
      .getByRole('button', { name: /Sage Nomad #009/ })
      .filter({ visible: true })
      .first()
    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/favorites/sage-nomad-009') && r.ok())
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await saved
    await page.reload()
    await expect(
      page
        .getByRole('button', { name: /Remover Sage Nomad #009 dos favoritos/ })
        .filter({ visible: true })
        .first(),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/favoritos')
    await expect(page.getByText('Sage Nomad #009')).toBeVisible()
  })

  test.describe('falha na mutation', () => {
    test.use({ scenario: 'favorites-failure' })
    test('atualização otimista é revertida e o erro é informado', async ({ page }) => {
      await login(page, 'ana', '/nft/sage-nomad-009')
      const toggle = page
        .getByRole('button', { name: /Favoritar Sage Nomad #009/ })
        .filter({ visible: true })
        .first()
      await toggle.click()
      await expect(
        page
          .getByRole('button', { name: /Sage Nomad #009/ })
          .filter({ visible: true })
          .first(),
      ).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByText(/Não foi possível favoritar Sage Nomad #009/).first()).toBeVisible()
      await expect(
        page
          .getByRole('button', { name: /Favoritar Sage Nomad #009/ })
          .filter({ visible: true })
          .first(),
      ).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
