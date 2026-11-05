import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOut, User as UserIcon, Wallet } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { toast } from 'sonner'
import { useSession } from '@/shared/api/session-store'
import { cartCount, useCart } from '@/features/cart/queries'
import { useLogout } from '@/features/auth/session'
import { FigmaIcon } from './icons'
import { SearchDialog } from './search-dialog'
import { cn } from '@/shared/lib/utils'

type NavKey = 'home' | 'market'

const MARKET_PATHS = ['/nft/', '/carrinho', '/pagamento', '/pedidos/']

export function useActiveNav(): NavKey {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return MARKET_PATHS.some((p) => pathname.startsWith(p)) ? 'market' : 'home'
}

export function notAvailable(label: string) {
  toast.info(`${label} não faz parte desta demonstração.`)
}

function NavItem({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('relative flex flex-col', active ? 'font-bold text-text-accent' : 'text-foreground')}>
      {children}
      {active && <span aria-hidden className="absolute -bottom-[24px] left-0 h-[3px] w-full rounded-full bg-primary" />}
    </span>
  )
}

export function Header({ divider = false }: { divider?: boolean }) {
  const active = useActiveNav()
  const session = useSession()
  const { data: cart } = useCart()
  const count = cartCount(cart)

  return (
    <header className={cn('hidden md:block', divider && 'border-b border-border')}>
      <div className="container-page flex h-[45px] items-start justify-between gap-4 pt-0 text-[16px]">
        <Link
          to="/"
          className="flex h-[34px] w-[160px] items-center text-[14px] font-bold tracking-[1.4px] text-foreground"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex gap-6 lg:gap-10">
          <Link to="/" aria-current={active === 'home' ? 'page' : undefined}>
            <NavItem active={active === 'home'}>Início</NavItem>
          </Link>
          <Link to="/" hash="catalogo" aria-current={active === 'market' ? 'page' : undefined}>
            <NavItem active={active === 'market'}>Mercado</NavItem>
          </Link>
          <button type="button" onClick={() => notAvailable('A página de criadores')}>
            <NavItem active={false}>Criadores</NavItem>
          </button>
          <button type="button" onClick={() => notAvailable('A área de conteúdos')}>
            <NavItem active={false}>Aprenda</NavItem>
          </button>
        </nav>

        <div className="flex items-center gap-7">
          <SearchDialog
            trigger={
              <button type="button" aria-label="Buscar NFTs" className="grid size-8 place-items-center">
                <FigmaIcon name="search" size={20} />
              </button>
            }
          />
          <Link
            to="/carrinho"
            className="relative grid h-8 w-9 place-items-center"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
          >
            <FigmaIcon name="cart" size={24} />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 right-0 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-ink ring-2 ring-ink"
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          {session ? <UserMenu name={session.user.displayName} avatarUrl={session.user.avatarUrl} /> : <LoginButton />}
        </div>
      </div>
    </header>
  )
}

function LoginButton() {
  const location = useRouterState({ select: (s) => s.location })
  return (
    <Link
      to="/entrar"
      search={{ redirect: location.href === '/entrar' ? undefined : location.href }}
      className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-[6px] bg-primary font-medium text-ink hover:bg-primary-hover"
    >
      <FigmaIcon name="login" size={20} />
      Entrar
    </Link>
  )
}

function UserMenu({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex h-[35px] max-w-[180px] items-center gap-2 rounded-[6px] border border-primary px-2 text-[14px] text-text-accent"
        aria-label={`Menu da conta de ${name}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary text-[12px] font-bold text-ink">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate">{name.split(' ')[0]}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] rounded-[6px] border border-border-soft bg-surface-card p-1 text-[14px] text-foreground shadow-xl"
        >
          <DropdownMenu.Item
            onSelect={() => navigate({ to: '/perfil' })}
            className="flex h-10 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-accent"
          >
            <UserIcon aria-hidden className="size-4" /> Meu perfil
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => navigate({ to: '/carteiras' })}
            className="flex h-10 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-accent"
          >
            <Wallet aria-hidden className="size-4" /> Carteiras
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => logout.mutate(undefined, { onSettled: () => navigate({ to: '/' }) })}
            className="flex h-10 cursor-pointer items-center gap-2 rounded px-3 outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-accent"
          >
            <LogOut aria-hidden className="size-4" /> Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
