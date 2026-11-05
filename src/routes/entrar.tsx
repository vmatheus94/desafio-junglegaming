import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { sessionStore } from '@/shared/api/session-store'
import { LoginScreen } from '@/features/auth/auth-screen'
import { safeRedirect } from '@/features/auth/redirect'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
    reason: z.literal('expired').optional().catch(undefined),
  }),
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: function LoginRoute() {
    const { redirect: target, reason } = Route.useSearch()
    return <LoginScreen redirect={target} reason={reason} />
  },
})
