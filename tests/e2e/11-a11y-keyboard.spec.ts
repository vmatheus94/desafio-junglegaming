import { test, expect, addToCart } from '../support/fixtures'

test.describe('11 · Teclado, foco em diálogos e validação de formulários', () => {
  test('link de pular conteúdo e navegação por teclado @desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo article').first()).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo/)
  })

  test('diálogo de busca prende o foco e devolve ao gatilho @desktop', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Termo de busca' })).toBeFocused()
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('busca pelo teclado leva ao catálogo filtrado @desktop', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.keyboard.type('baron')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=baron/)
    await expect(page.locator('#catalogo article h3').first()).toContainText('Baron')
  })

  test('erros de formulário ficam associados aos campos', async ({ page }) => {
    await page.goto('/entrar')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = page.getByRole('textbox', { name: 'E-mail' })
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    await expect(page.locator(`#${describedBy}`)).toHaveText('Informe seu e-mail')
  })

  test('quantidade do carrinho operável pelo teclado', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042')
    const inc = page.getByTestId('cart-item-emerald-ape-042').getByRole('button', { name: 'Aumentar quantidade' })
    await inc.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
  })
})
