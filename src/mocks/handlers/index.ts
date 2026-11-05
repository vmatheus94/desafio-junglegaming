import { authHandlers } from './auth'
import { catalogHandlers } from './catalog'
import { favoritesHandlers } from './favorites'
import { cartHandlers } from './cart'
import { ordersHandlers } from './orders'
import { profileHandlers, walletHandlers } from './account'
import { realtimeHandlers } from '../realtime/server'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...ordersHandlers,
  ...profileHandlers,
  ...walletHandlers,
  ...realtimeHandlers,
]
