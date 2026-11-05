import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/shared/api/session-store'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.get()) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
