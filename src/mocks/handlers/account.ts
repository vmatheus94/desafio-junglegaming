import { z } from 'zod'
import {
  AvatarInputSchema,
  NetworkIdSchema,
  PasswordChangeInputSchema,
  ProfileInputSchema,
  WalletInputSchema,
  WalletSlotSchema,
  WalletTypeSchema,
  type Wallet,
} from '@/shared/contracts'
import { db, nowIso, persist } from '../db'
import { hashPassword, randomId, verifyPassword } from '../db/crypto'
import { API, apiError, authenticate, http, HttpResponse, publicUser, readJson, scenario, validationError } from './utils'

const MAX_AVATAR_BYTES = 1_500_000

export const profileHandlers = [
  http.get(
    `${API}/profile`,
    scenario('profile', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ user: publicUser(auth.user) })
    }),
  ),

  http.patch(
    `${API}/profile`,
    scenario('profile', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = ProfileInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const input = parsed.data
      const others = Object.values(db().users).filter((u) => u.id !== auth.user.id)
      const fields: Record<string, string> = {}
      if (others.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) fields.email = 'Este e-mail já está em uso.'
      if (others.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
        fields.username = 'Este nome de usuário já está em uso.'
      }
      if (Object.keys(fields).length) return apiError(409, 'conflict', 'Alguns dados já estão em uso.', { fields })
      Object.assign(auth.user, {
        displayName: input.displayName,
        username: input.username,
        email: input.email.toLowerCase(),
        ensName: input.ensName,
        walletAlias: input.walletAlias,
      })
      persist()
      return HttpResponse.json({ user: publicUser(auth.user) })
    }),
  ),

  http.put(
    `${API}/profile/avatar`,
    scenario('profile', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = AvatarInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error, 'Formato de imagem não suportado.')
      const bytes = Math.ceil((parsed.data.dataUrl.length - parsed.data.dataUrl.indexOf(',') - 1) * 0.75)
      if (bytes > MAX_AVATAR_BYTES) {
        return apiError(422, 'validation_error', 'A imagem deve ter no máximo 1,5 MB.', {
          fields: { avatar: 'A imagem deve ter no máximo 1,5 MB.' },
        })
      }
      auth.user.avatarUrl = parsed.data.dataUrl
      persist()
      return HttpResponse.json({ user: publicUser(auth.user) })
    }),
  ),

  http.delete(
    `${API}/profile/avatar`,
    scenario('profile', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      auth.user.avatarUrl = null
      persist()
      return HttpResponse.json({ user: publicUser(auth.user) })
    }),
  ),

  http.put(
    `${API}/profile/password`,
    scenario('profile', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = PasswordChangeInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const ok = await verifyPassword(parsed.data.currentPassword, auth.user.salt, auth.user.passwordHash)
      if (!ok) {
        return apiError(422, 'invalid_password', 'A senha atual está incorreta.', {
          fields: { currentPassword: 'A senha atual está incorreta.' },
        })
      }
      const { hash, salt } = await hashPassword(parsed.data.newPassword)
      auth.user.passwordHash = hash
      auth.user.salt = salt
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]

const CreateWalletSchema = WalletInputSchema.extend({ slot: WalletSlotSchema })

export const walletHandlers = [
  http.get(
    `${API}/wallets`,
    scenario('wallets', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ wallets: db().wallets[auth.user.id] ?? [] })
    }),
  ),

  http.post(
    `${API}/wallets`,
    scenario('wallets', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = CreateWalletSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const list = (db().wallets[auth.user.id] ??= [])
      if (list.some((w) => w.slot === parsed.data.slot)) {
        return apiError(409, 'conflict', 'Você já cadastrou uma carteira nesta posição.')
      }
      if (parsed.data.slot === 'secondary' && !list.some((w) => w.slot === 'primary')) {
        return apiError(422, 'validation_error', 'Cadastre a carteira principal primeiro.')
      }
      if (list.some((w) => w.address.toLowerCase() === parsed.data.address.toLowerCase())) {
        return apiError(409, 'conflict', 'Este endereço já está cadastrado.', { fields: { address: 'Este endereço já está cadastrado.' } })
      }
      const wallet: Wallet = { ...parsed.data, id: `wal_${randomId(8)}`, updatedAt: nowIso() }
      list.push(wallet)
      persist()
      return HttpResponse.json({ wallet }, { status: 201 })
    }),
  ),

  http.patch(
    `${API}/wallets/:walletId`,
    scenario('wallets', async ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = WalletInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const list = db().wallets[auth.user.id] ?? []
      const wallet = list.find((w) => w.id === params.walletId)
      if (!wallet) return apiError(404, 'not_found', 'Carteira não encontrada.')
      if (list.some((w) => w.id !== wallet.id && w.address.toLowerCase() === parsed.data.address.toLowerCase())) {
        return apiError(409, 'conflict', 'Este endereço já está cadastrado.', { fields: { address: 'Este endereço já está cadastrado.' } })
      }
      Object.assign(wallet, parsed.data, { updatedAt: nowIso() })
      const conn = db().connections[auth.user.id]
      if (conn?.walletId === wallet.id) db().connections[auth.user.id] = null
      persist()
      return HttpResponse.json({ wallet })
    }),
  ),

  http.get(
    `${API}/wallets/connection`,
    scenario('wallets', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ connection: db().connections[auth.user.id] ?? null })
    }),
  ),

  http.post(
    `${API}/wallets/:walletId/connect`,
    scenario('wallets', async ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = z
        .object({ network: NetworkIdSchema, approved: z.boolean(), provider: WalletTypeSchema })
        .safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const wallet = (db().wallets[auth.user.id] ?? []).find((w) => w.id === params.walletId)
      if (!wallet) return apiError(404, 'not_found', 'Carteira não encontrada.')
      if (!parsed.data.approved) {
        return apiError(403, 'wallet_rejected', 'A conexão foi recusada na carteira.')
      }
      const connection = {
        walletId: wallet.id,
        network: parsed.data.network,
        provider: parsed.data.provider,
        address: wallet.address,
        connectedAt: nowIso(),
      }
      db().connections[auth.user.id] = connection
      persist()
      return HttpResponse.json({ connection })
    }),
  ),

  http.delete(
    `${API}/wallets/connection`,
    scenario('wallets', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      db().connections[auth.user.id] = null
      persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
