import { test, expect, login } from '../support/fixtures'

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

test.describe('08 · Perfil, avatar, senha e carteiras', () => {
  test('edita o perfil com validação e persiste após refresh', async ({ page }) => {
    await login(page, 'ana', '/perfil')
    const name = page.getByRole('textbox', { name: 'Nome de exibição' })
    await name.fill('A')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Informe seu nome de exibição')).toBeVisible()

    await name.fill('Ana Paula')
    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('bruno.nft')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('ana.paula')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.').first()).toBeVisible()
    await page.reload()
    await expect(name).toHaveValue('Ana Paula')
  })

  test('altera e remove o avatar', async ({ page }) => {
    await login(page, 'ana', '/perfil')
    await page.locator('#avatar-file').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX })
    await expect(page.getByRole('img', { name: 'Avatar de Ana Souza' })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Avatar de Ana Souza' })).toHaveCount(0)
  })

  test('alteração de senha valida a senha atual', async ({ page }) => {
    await login(page, 'ana', '/perfil')
    await page.getByLabel('Senha atual').fill('errada000')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha1')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A senha atual está incorreta.').first()).toBeVisible()

    await page.getByLabel('Senha atual').fill('Kurio@2026')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil e senha atualizados.').first()).toBeVisible()
  })

  test('carteiras: validação e cadastro da secundária', async ({ page }) => {
    await login(page, 'bruno', '/carteiras')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Endereço inválido/)).toBeVisible()

    await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).check({ force: true })
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Reserva')
    await secondary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x1111111111111111111111111111111111111111')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue(
      'Reserva',
    )
  })
})
