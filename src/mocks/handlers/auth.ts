import { LoginInputSchema, RegisterInputSchema } from '@/shared/contracts'
import { createSession, db, persist, type UserRecord } from '../db'
import { hashPassword, randomId, verifyPassword } from '../db/crypto'
import { is } from '../scenarios'
import { API, apiError, authenticate, http, HttpResponse, publicUser, readJson, scenario, validationError } from './utils'

const SHORT_SESSION_MS = 45_000

function ttl() {
  return is('short-session') ? SHORT_SESSION_MS : undefined
}

export const authHandlers = [
  http.post(
    `${API}/auth/register`,
    scenario('auth', async ({ request }) => {
      const parsed = RegisterInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const { username, email, password } = parsed.data
      const users = Object.values(db().users)
      const fields: Record<string, string> = {}
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        fields.email = 'Já existe uma conta com este e-mail.'
      }
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        fields.username = 'Este nome de usuário já está em uso.'
      }
      if (Object.keys(fields).length) {
        return apiError(409, fields.email ? 'email_taken' : 'username_taken', 'Não foi possível criar a conta.', { fields })
      }
      const { hash, salt } = await hashPassword(password)
      const user: UserRecord = {
        id: `usr_${randomId(10)}`,
        username,
        displayName: username,
        email: email.toLowerCase(),
        ensName: null,
        walletAlias: null,
        avatarUrl: null,
        passwordHash: hash,
        salt,
      }
      db().users[user.id] = user
      db().favorites[user.id] = []
      db().wallets[user.id] = []
      persist()
      const session = createSession(user.id, ttl())
      return HttpResponse.json({ user: publicUser(user), ...session }, { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/login`,
    scenario('auth', async ({ request }) => {
      const parsed = LoginInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return validationError(parsed.error)
      const user = Object.values(db().users).find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase())
      if (!user || !(await verifyPassword(parsed.data.password, user.salt, user.passwordHash))) {
        return apiError(401, 'invalid_credentials', 'E-mail ou senha incorretos.')
      }
      const session = createSession(user.id, ttl())
      return HttpResponse.json({ user: publicUser(user), ...session })
    }),
  ),

  http.get(
    `${API}/session`,
    scenario('auth', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const s = db().sessions[auth.token]
      return HttpResponse.json({ user: publicUser(auth.user), expiresAt: new Date(s.expiresAt).toISOString() })
    }),
  ),

  http.post(
    `${API}/auth/logout`,
    scenario('auth', ({ request }) => {
      const header = request.headers.get('Authorization')
      const token = header?.startsWith('Bearer ') ? header.slice(7) : null
      if (token && db().sessions[token]) {
        const userId = db().sessions[token].userId
        delete db().sessions[token]
        db().connections[userId] = null
        persist()
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
