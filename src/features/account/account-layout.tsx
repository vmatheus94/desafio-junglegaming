import type { ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Activity, AlertTriangle, Download, Heart, LogOut, MapPin, ShoppingBag, User } from 'lucide-react'
import { useLogout } from '@/features/auth/session'
import { notAvailable } from '@/shared/components/header'
import { cn } from '@/shared/lib/utils'

export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const logout = useLogout()

  const item = (active: boolean) =>
    cn(
      'flex h-[45px] w-full items-center gap-4 px-4 text-left text-[15px]',
      active ? 'rounded-[6px] bg-surface-card font-bold text-text-accent' : 'text-foreground hover:text-text-accent',
    )

  return (
    <main id="conteudo" className="container-page mt-6 pb-10 md:mt-8">
      <title>{`${title} · Kurio`}</title>
      <div className="flex flex-col gap-7 lg:flex-row">
        <nav aria-label="Minha conta" className="w-full shrink-0 lg:w-[310px]">
          <p className="mb-2 hidden w-fit rounded-[6px] px-2.5 py-2.5 text-[16px] font-bold leading-4 lg:block">Meu perfil</p>
          <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0">
            <li className="shrink-0">
              <Link to="/perfil" className={item(pathname === '/perfil')} aria-current={pathname === '/perfil' ? 'page' : undefined}>
                <User aria-hidden className="size-[18px]" /> Dados do perfil
              </Link>
            </li>
            <li className="shrink-0">
              <Link
                to="/carteiras"
                className={item(pathname === '/carteiras')}
                aria-current={pathname === '/carteiras' ? 'page' : undefined}
              >
                <MapPin aria-hidden className="size-5" /> Carteiras
              </Link>
            </li>
            <li className="shrink-0">
              <Link to="/carrinho" className={item(false)}>
                <ShoppingBag aria-hidden className="size-[18px]" /> Carrinho
              </Link>
            </li>
            <li className="shrink-0">
              <Link
                to="/favoritos"
                className={item(pathname === '/favoritos')}
                aria-current={pathname === '/favoritos' ? 'page' : undefined}
              >
                <Heart aria-hidden className="size-4" /> Lista de interesse
              </Link>
            </li>
            <li className="hidden shrink-0 lg:block">
              <button type="button" className={item(false)} onClick={() => notAvailable('A atividade da conta')}>
                <Activity aria-hidden className="size-[18px]" /> Atividade
              </button>
            </li>
            <li className="hidden shrink-0 lg:block">
              <button type="button" className={item(false)} onClick={() => notAvailable('A área de downloads')}>
                <Download aria-hidden className="size-[18px]" /> Downloads
              </button>
            </li>
            <li className="hidden shrink-0 lg:block">
              <button type="button" className={item(false)} onClick={() => notAvailable('O suporte')}>
                <AlertTriangle aria-hidden className="size-[18px]" /> Suporte
              </button>
            </li>
            <li className="shrink-0 lg:mt-0 lg:border-t lg:border-border">
              <button
                type="button"
                className={cn(item(false), 'h-10')}
                onClick={() => logout.mutate(undefined, { onSettled: () => navigate({ to: '/' }) })}
              >
                <LogOut aria-hidden className="size-5" /> Sair
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  )
}
