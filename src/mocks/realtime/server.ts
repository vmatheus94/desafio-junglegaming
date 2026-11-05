import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/shared/contracts'
import { db } from '../db'
import { bus } from './bus'

interface Connection {
  id: string
  userId: string | null
  emit: (event: string, payload: unknown) => void
  close: () => void
  ping: ReturnType<typeof setInterval>
}

const connections = new Map<string, Connection>()
let blocked = false
let lastEvent: { name: string; payload: NftUpdatedEvent | OrderUpdatedEvent; userId: string | null } | null = null

const SOCKET_ORIGIN = (import.meta.env.VITE_SOCKET_URL || window.location.origin).replace(/^http/, 'ws')
export const realtimeLink = ws.link(`${SOCKET_ORIGIN}/`)

function userFromToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const session = db().sessions[token]
  if (!session || session.expiresAt <= Date.now()) return null
  return session.userId
}

export const realtimeHandlers = [
  realtimeLink.addEventListener('connection', (connection) => {
    const { client } = connection

    if (blocked) {
      queueMicrotask(() => client.close(1011, 'Servidor indisponível'))
      return
    }

    const io = toSocketIo(connection)
    const conn: Connection = {
      id: client.id,
      userId: null,
      emit: (event, payload) => io.client.emit(event, payload),
      close: () => client.close(1001, 'Servidor encerrou a conexão'),
      ping: setInterval(() => {
        try {
          client.send('2')
        } catch {}
      }, 20_000),
    }
    connections.set(client.id, conn)

    client.addEventListener('message', (event) => {
      const data = event.data
      if (typeof data === 'string' && data.startsWith('40')) {
        try {
          const auth = JSON.parse(data.slice(2) || '{}') as { token?: string }
          conn.userId = userFromToken(auth.token)
        } catch {
          conn.userId = null
        }
      }
    })

    client.addEventListener('close', () => {
      clearInterval(conn.ping)
      connections.delete(client.id)
    })
  }),
]

bus.subscribe((msg) => {
  if (msg.kind === 'nft') {
    lastEvent = { name: msg.event.type, payload: msg.event, userId: null }
    connections.forEach((c) => c.emit(msg.event.type, msg.event))
  } else {
    lastEvent = { name: msg.event.type, payload: msg.event, userId: msg.event.data.userId }
    connections.forEach((c) => {
      if (c.userId && c.userId === msg.event.data.userId) c.emit(msg.event.type, msg.event)
    })
  }
})

export const realtimeControl = {
  disconnectAll() {
    connections.forEach((c) => c.close())
  },
  setBlocked(value: boolean) {
    blocked = value
    if (value) this.disconnectAll()
  },
  isBlocked: () => blocked,
  connectionCount: () => connections.size,
  replayLast() {
    if (!lastEvent) return false
    const { name, payload, userId } = lastEvent
    connections.forEach((c) => {
      if (!userId || c.userId === userId) c.emit(name, payload)
    })
    return true
  },
  emitRaw(name: string, payload: unknown, userId: string | null = null) {
    connections.forEach((c) => {
      if (!userId || c.userId === userId) c.emit(name, payload)
    })
  },
}
