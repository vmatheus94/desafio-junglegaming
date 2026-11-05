import axios, { type InternalAxiosRequestConfig } from 'axios'
import { toApiError } from './errors'
import { getGuestCartId, sessionStore } from './session-store'
import { waitForBackend } from './backend-ready'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TIMEOUT = Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 8000

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: { Accept: 'application/json' },
})

type SessionExpiredHandler = () => void
let onSessionExpired: SessionExpiredHandler | null = null

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  onSessionExpired = handler
}

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await waitForBackend()
  const token = sessionStore.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Cart', getGuestCartId())
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const sentToken = (error?.config?.headers?.Authorization as string | undefined)?.replace('Bearer ', '')
    if (
      apiError.kind === 'unauthorized' &&
      sentToken &&
      sentToken === sessionStore.getToken() &&
      !error?.config?.url?.startsWith('/auth/')
    ) {
      onSessionExpired?.()
    }
    return Promise.reject(apiError)
  },
)
