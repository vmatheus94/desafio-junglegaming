import { test, expect, login, addToCart } from '../support/fixtures'

test.describe('05 · Carrinho: quantidades, remoção, cupom e persistência', () => {
  test('altera quantidade, remove itens e mantém após refresh', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042')
    await addToCart(page, 'violet-nomad-314')
    const item = page.getByTestId('cart-item-emerald-ape-042')
    await item.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(item.locator('output')).toHaveText('2')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.77 ETH')

    await page.reload()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.77 ETH')

    await page.getByRole('button', { name: 'Remover Violet Nomad #314 do carrinho' }).click()
    await expect(page.getByTestId('cart-item-violet-nomad-314')).toHaveCount(0)
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
  })

  test('cupom inválido, expirado e válido', async ({ page }) => {
    await addToCart(page, 'emerald-ape-042')
    const input = page.getByRole('textbox', { name: 'Código promocional' })
    await input.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Código promocional inválido.')).toBeVisible()

    await input.fill('VERAO25')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('O cupom VERAO25 expirou.')).toBeVisible()

    await input.fill('KURIO10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 0.119 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('1.087 ETH')

    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await expect(page.getByTestId('summary-discount')).toHaveText('(-) 00.00')
  })

  test('itens do visitante são preservados ao autenticar', async ({ page }) => {
    await addToCart(page, 'ivory-baron-088', 2)
    await login(page, 'ana', '/carrinho')
    await expect(page.getByTestId('cart-item-ivory-baron-088')).toBeVisible()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('3.58 ETH')
  })
})
