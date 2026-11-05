import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import { setSessionExpiredHandler } from '@/shared/api/http-client'
import { sessionStore } from '@/shared/api/session-store'
import { endSession } from '@/features/auth/session'
import { announce } from '@/shared/components/live-region'
import { RealtimeProvider } from '@/shared/realtime/realtime-provider'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))

  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!sessionStore.get()) return
      endSession(queryClient, 'expired')
      const msg = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'
      toast.warning(msg, { id: 'session-expired' })
      announce(msg, 'assertive')
      const { href, pathname } = router.state.location
      if (pathname !== '/entrar') {
        router.navigate({ to: '/entrar', search: { redirect: href, reason: 'expired' }, replace: true })
      }
    })
  }, [queryClient, router])

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
