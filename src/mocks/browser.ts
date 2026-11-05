import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { initDb, settleDueOrders } from './db'
import { initScenario } from './scenarios'
import { mockControl } from './control'

export async function startMocks() {
  initScenario()
  await initDb()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/api')) print.warning()
    },
    quiet: import.meta.env.PROD,
  })
  setInterval(settleDueOrders, 400)
  window.__kurioMock = mockControl
  return worker
}
