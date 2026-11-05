import { Link, useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { usePendingOrders } from './queries'

export function PendingOrderBanner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data } = usePendingOrders()
  const pending = data?.[0]
  if (!pending || pathname.startsWith('/pedidos/')) return null
  return (
    <div role="status" className="container-page mt-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-primary bg-surface-card px-4 py-3 text-[14px]">
        <Loader2 aria-hidden className="size-4 animate-spin text-text-accent" />
        <span className="flex-1">Você tem um pedido aguardando a confirmação do pagamento.</span>
        <Link to="/pedidos/$orderId" params={{ orderId: pending.id }} className="font-bold text-text-accent underline underline-offset-4">
          Acompanhar pedido
        </Link>
      </div>
    </div>
  )
}
