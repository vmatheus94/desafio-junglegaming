import { lazy, Suspense } from 'react'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import type { RouterContext } from '@/app/router'
import { Header } from '@/shared/components/header'
import { Footer } from '@/shared/components/footer'
import { MobileTabBar } from '@/shared/components/mobile-tab-bar'
import { LiveRegion } from '@/shared/components/live-region'
import { NotFound, RouteError } from '@/shared/components/route-states'
import { PendingOrderBanner } from '@/features/checkout/pending-order-banner'
import { useSessionValidation } from '@/features/auth/session'

const MockPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/panel')) : null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

const DIVIDER_PATHS = ['/', '/perfil', '/carteiras', '/favoritos', '/entrar', '/cadastro']
const TAB_BAR_PATHS = ['/', '/perfil', '/carteiras', '/favoritos']

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useSessionValidation()

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <div className="pt-6">
        <Header divider={DIVIDER_PATHS.includes(pathname)} />
      </div>
      <PendingOrderBanner />
      <Outlet />
      <Footer />
      {TAB_BAR_PATHS.includes(pathname) && <MobileTabBar />}
      <LiveRegion />
      <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }} />
      {MockPanel && (
        <Suspense fallback={null}>
          <MockPanel />
        </Suspense>
      )}
    </>
  )
}
