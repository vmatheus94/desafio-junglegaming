import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, Home, ScanLine, ShoppingCart, User } from 'lucide-react'
import { cartCount, useCart } from '@/features/cart/queries'
import { SearchDialog } from './search-dialog'
import { cn } from '@/shared/lib/utils'

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: cart } = useCart()
  const count = cartCount(cart)

  const item = (active: boolean) =>
    cn('grid size-11 place-items-center rounded-full', active ? 'text-primary' : 'text-secondary hover:text-text-accent')

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative mx-auto h-[95px] max-w-[480px] rounded-t-[32px] bg-surface-card shadow-[0_-8px_24px_rgba(10,6,4,0.5)]">
        <div className="grid h-full grid-cols-5 place-items-center px-6 pb-3">
          <Link to="/" aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined} className={item(pathname === '/')}>
            <Home aria-hidden className="size-5" fill="currentColor" />
          </Link>
          <Link
            to="/favoritos"
            aria-label="Favoritos"
            aria-current={pathname === '/favoritos' ? 'page' : undefined}
            className={item(pathname === '/favoritos')}
          >
            <Heart aria-hidden className="size-5" fill="currentColor" />
          </Link>
          <span aria-hidden />
          <Link to="/carrinho" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className={cn(item(false), 'relative')}>
            <ShoppingCart aria-hidden className="size-5" />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-ink"
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <Link
            to="/perfil"
            aria-label="Minha conta"
            aria-current={pathname === '/perfil' ? 'page' : undefined}
            className={item(pathname === '/perfil' || pathname === '/carteiras')}
          >
            <User aria-hidden className="size-5" fill="currentColor" />
          </Link>
        </div>
        <SearchDialog
          trigger={
            <button
              type="button"
              aria-label="Explorar coleções"
              className="absolute -top-8 left-1/2 grid size-[65px] -translate-x-1/2 place-items-center rounded-full border-[6px] border-ink bg-gradient-to-br from-primary/70 to-primary text-ink shadow-lg"
            >
              <ScanLine aria-hidden className="size-6" />
            </button>
          }
        />
      </div>
    </nav>
  )
}
