import { test, expect, isMobile } from '../support/fixtures'

test.describe('01 · Catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('filtros combinados e ordenação compõem a URL e reiniciam a paginação', async ({ page }) => {
    await page.goto('/?page=2')
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    const filters = isMobile(page)
      ? (await page.getByRole('button', { name: 'Abrir filtros' }).click(), page.getByRole('dialog'))
      : page.getByRole('complementary', { name: 'Filtros e destaque' })

    await filters.getByText('Música', { exact: true }).click()
    await expect(page).toHaveURL(/categories=music/)
    await expect(page).not.toHaveURL(/page=/)

    await filters.getByText('Solana', { exact: true }).click()
    await expect(page).toHaveURL(/networks=solana/)
    if (isMobile(page)) await page.keyboard.press('Escape')

    const names = page.locator('#catalogo article h3')
    await expect(names).toHaveCount(3)
    await expect(names.filter({ hasText: 'Golden Beat #207' })).toHaveCount(1)
    await expect(names.filter({ hasText: 'Emerald Ape #042' })).toHaveCount(0)

    await page.getByRole('button', { name: /Ordenar por/ }).click()
    await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(names.first()).toHaveText('Golden Echo #133')
  })

  test('busca, paginação e restauração pelo histórico e refresh', async ({ page }) => {
    await page.goto('/?q=sentinel')
    const names = page.locator('#catalogo article h3')
    await expect(names.first()).toHaveText('Moss Sentinel #248')
    await expect(names).toHaveCount(1)

    await page.goto('/')
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    const page2First = await names.first().textContent()

    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=trending/)
    await expect(page).not.toHaveURL(/page=2/)

    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(names.first()).toHaveText(page2First!)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect(names.first()).toHaveText(page2First!)
  })

  test('resultado vazio oferece limpar filtros', async ({ page }) => {
    await page.goto('/?q=inexistente-xyz')
    await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(page.locator('#catalogo article').first()).toBeVisible()
  })

  test.describe('respostas fora de ordem', () => {
    test.use({ scenario: 'variable-latency' })
    test('a resposta antiga não sobrescreve o filtro mais recente @desktop', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('#catalogo article').first()).toBeVisible({ timeout: 10_000 })
      await page.getByRole('tab', { name: 'Em alta' }).click()
      await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
      await expect(page).toHaveURL(/tab=new/)
      await page.waitForTimeout(2200)
      await expect(page.getByRole('tab', { name: 'Novos lançamentos' })).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('#catalogo article h3').first()).toHaveText('Emerald Ape #042')
    })
  })
})
