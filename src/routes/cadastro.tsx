import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { sessionStore } from '@/shared/api/session-store'
import { RegisterScreen } from '@/features/auth/auth-screen'
import { safeRedirect } from '@/features/auth/redirect'

export const Route = createFileRoute('/cadastro')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    if (sessionStore.get()) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: function RegisterRoute() {
    const { redirect: target } = Route.useSearch()
    return <RegisterScreen redirect={target} />
  },
})
