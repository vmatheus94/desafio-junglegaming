import { test, expect, login, USERS } from '../support/fixtures'

test.describe('03 · Cadastro, login, expiração de sessão, logout e troca de usuário', () => {
  test('cadastro valida campos e trata conflito de e-mail', async ({ page }) => {
    await page.goto('/cadastro')
    await page
      .getByRole('button', { name: /Criar (conta|perfil)/ })
      .filter({ visible: true })
      .click()
    await expect(page.getByText('Use pelo menos 3 caracteres')).toBeVisible()

    await page.getByRole('textbox', { name: 'Nome de usuário' }).fill('nova.conta')
    await page.getByRole('textbox', { name: 'Digite seu e-mail' }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('Senha1234')
    await page.getByLabel('Confirmar senha', { exact: true }).fill('Senha1234')
    await page
      .getByRole('button', { name: /Criar (conta|perfil)/ })
      .filter({ visible: true })
      .click()
    await expect(page.getByText('Já existe uma conta com este e-mail.')).toBeVisible()

    await page.getByRole('textbox', { name: 'Digite seu e-mail' }).fill('nova@kurio.dev')
    await page
      .getByRole('button', { name: /Criar (conta|perfil)/ })
      .filter({ visible: true })
      .click()
    await expect(page).toHaveURL('/')
  })

  test('login inválido mostra erro; válido retorna ao fluxo anterior', async ({ page }) => {
    await page.goto('/entrar?redirect=%2Fnft%2Femerald-ape-042')
    await page.getByRole('textbox', { name: 'E-mail' }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill('errada123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
  })

  test('sessão sobrevive ao refresh e expira durante a navegação', async ({ page, mock }) => {
    await login(page, 'ana', '/perfil')
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Souza')
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Nome de exibição' })).toHaveValue('Ana Souza')

    await mock.expireSessions()
    await page.goto('/carteiras')
    await expect(page).toHaveURL(/\/entrar.*reason=expired/)
    await expect(page.getByText('Sua sessão expirou').first()).toBeVisible()

    await page.getByRole('textbox', { name: 'E-mail' }).fill(USERS.ana.email)
    await page.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/carteiras/)
  })

  test('logout e troca de usuário não vazam dados privados', async ({ page }) => {
    await login(page, 'ana', '/favoritos')
    await expect(page.getByText('Emerald Ape #042')).toBeVisible()

    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/')
    await page.waitForFunction(() => !localStorage.getItem('kurio:session'))
    await page.goto('/favoritos')
    await expect(page).toHaveURL(/\/entrar/)

    await login(page, 'bruno', '/favoritos')
    await expect(page.getByText('Golden Beat #207')).toBeVisible()
    await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
  })
})
