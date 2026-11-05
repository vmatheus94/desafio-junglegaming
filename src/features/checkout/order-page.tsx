import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, XCircle } from 'lucide-react'
import { useSession } from '@/shared/api/session-store'
import { errorMessage, isApiError } from '@/shared/api/errors'
import type { Order } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/money'
import { NETWORK_LABELS } from '@/shared/lib/labels'
import { formatReceiptDate, shortAddress } from '@/shared/lib/utils'
import { removeKey, STORAGE_KEYS } from '@/shared/lib/storage'
import { NftImage } from '@/shared/components/nft-image'
import { useRealtimeStatus } from '@/shared/realtime/realtime-provider'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { finishOrderTracking, useOrder } from './queries'

export function OrderPage({ orderId }: { orderId: string }) {
  const session = useSession()
  const { data: order, isPending, isError, error, refetch, isFetching } = useOrder(orderId)

  useEffect(() => {
    if (!session || !order || order.status === 'pending') return
    finishOrderTracking(session.user.id)
    if (order.status === 'confirmed') removeKey(STORAGE_KEYS.checkoutDraft(session.user.id), 'session')
  }, [order, session])

  if (isPending) {
    return (
      <main id="conteudo" className="container-page py-10" aria-busy>
        <title>Pedido · Kurio</title>
        <Skeleton className="mx-auto h-[420px] max-w-[578px]" />
      </main>
    )
  }
  if (isError) {
    const kind = isApiError(error) ? error.kind : null
    return (
      <main id="conteudo" className="container-page py-10">
        <title>Pedido · Kurio</title>
        <StateMessage
          tone={kind === 'not_found' || kind === 'forbidden' ? 'neutral' : 'error'}
          title={
            kind === 'not_found' ? 'Pedido não encontrado' : kind === 'forbidden' ? 'Acesso negado' : 'Não foi possível carregar o pedido'
          }
          description={errorMessage(error)}
          action={
            kind === 'transient' ? (
              <Button onClick={() => refetch()} loading={isFetching}>
                Tentar novamente
              </Button>
            ) : (
              <Button asChild>
                <Link to="/">Voltar ao início</Link>
              </Button>
            )
          }
        />
      </main>
    )
  }

  if (order.status === 'pending') return <PendingOrder order={order} />
  if (order.status === 'rejected') return <RejectedOrder order={order} />
  return <ConfirmedOrder order={order} />
}

function PendingOrder({ order }: { order: Order }) {
  const status = useRealtimeStatus()
  return (
    <main id="conteudo" className="container-page py-10">
      <title>Pagamento em processamento · Kurio</title>
      <section
        aria-labelledby="pending-title"
        className="mx-auto flex max-w-[578px] flex-col items-center gap-4 bg-surface-card px-6 py-10 text-center"
        role="status"
      >
        <Loader2 aria-hidden className="size-10 animate-spin text-text-accent" />
        <h1 id="pending-title" className="text-[18px] font-bold">
          Aguardando a confirmação do pagamento
        </h1>
        <p className="text-[14px] leading-6 text-text-secondary">
          Seu pedido <strong className="text-foreground">{order.id}</strong> no valor de{' '}
          <strong className="text-foreground">{formatEth(order.total)}</strong> foi enviado para a rede {NETWORK_LABELS[order.network]}.
          Você pode sair desta página: o pedido continua sendo processado e não será cobrado duas vezes.
        </p>
        <p className="text-[12px] text-secondary">
          {status === 'connected'
            ? 'Acompanhando em tempo real.'
            : status === 'reconnecting'
              ? 'Conexão em tempo real interrompida. Reconectando… (verificando o pedido periodicamente)'
              : 'Conectando ao tempo real…'}
        </p>
      </section>
    </main>
  )
}

function RejectedOrder({ order }: { order: Order }) {
  return (
    <main id="conteudo" className="container-page py-10">
      <title>Pagamento recusado · Kurio</title>
      <section
        aria-labelledby="rejected-title"
        className="mx-auto flex max-w-[578px] flex-col items-center gap-4 bg-surface-card px-6 py-10 text-center"
        role="alert"
      >
        <XCircle aria-hidden className="size-12 text-danger" />
        <h1 id="rejected-title" className="text-[18px] font-bold">
          Pagamento recusado
        </h1>
        <p className="text-[14px] leading-6 text-text-secondary">
          {order.rejectionReason ?? 'A carteira recusou o pagamento.'} Nenhum valor foi cobrado e seus itens continuam no carrinho.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/pagamento">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho">Ver carrinho</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

function ConfirmedOrder({ order }: { order: Order }) {
  const navigate = useNavigate()
  return (
    <main id="conteudo" className="container-page min-h-[60vh] py-10">
      <title>Pedido confirmado · Kurio</title>
      <Dialog open onOpenChange={(o) => !o && navigate({ to: '/' })}>
        <DialogContent className="top-6 max-w-[578px] translate-y-0 p-0 md:top-[60px]" data-testid="order-confirmation">
          <div className="flex h-[156px] flex-col items-center justify-center gap-4">
            <img src="/assets/figma/thank-you.svg" alt="" width={66} height={80} />
            <DialogTitle className="text-center text-[16px] font-bold leading-4 text-text-secondary">
              Seus NFTs agora estão na sua carteira
            </DialogTitle>
          </div>
          <div className="h-px bg-primary" />
          <dl className="grid grid-cols-2 gap-y-3 px-6 py-3 text-text-secondary sm:flex sm:h-[65px] sm:items-center sm:justify-between sm:px-9 sm:py-0">
            <Meta label="ID da transação" value={shortAddress(order.transactionHash ?? order.id)} bold />
            <div aria-hidden className="hidden h-[31px] w-px bg-primary sm:block" />
            <Meta label="Data" value={formatReceiptDate(order.updatedAt)} />
            <div aria-hidden className="hidden h-[31px] w-px bg-primary sm:block" />
            <Meta label="Total" value={formatEth(order.total)} />
            <div aria-hidden className="hidden h-[31px] w-px bg-primary sm:block" />
            <Meta label="Carteira" value={order.wallet.label} bold />
          </dl>
          <div className="h-px bg-primary" />
          <div className="flex flex-col gap-3 px-6 pb-12 pt-5 sm:px-11">
            <h2 className="text-[15px] font-bold leading-4">Detalhes da transação</h2>
            <div className="flex justify-between text-[16px] leading-4" aria-hidden>
              <span className="font-bold">NFTs</span>
              <span className="flex gap-12">
                <span className="font-bold">Edições</span>
                <span className="font-medium">Subtotal</span>
              </span>
            </div>
            <div className="h-px bg-border" />
            <ul className="flex flex-col gap-3" aria-label="Itens comprados">
              {order.lines.map((l) => (
                <li key={`${l.nftId}-${l.editionId}`} className="flex h-[70px] items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-3">
                    <NftImage src={l.image} alt="" sizes="70px" size={70} className="size-[60px] shrink-0 rounded-[8px] sm:size-[70px]" />
                    <span className="flex min-w-0 flex-col gap-1.5 leading-4">
                      <span className="truncate text-[15px] font-bold sm:text-[16px]">{l.name}</span>
                      <span className="text-[13px] text-secondary sm:text-[14px]">
                        ID do token: {l.tokenId} · {l.editionLabel}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-4 sm:gap-12">
                    <span className="text-[14px] text-text-secondary">(x {l.quantity})</span>
                    <span className="text-[16px] font-bold text-text-accent sm:text-[18px]">{formatEth(l.lineTotal)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-3">
              {order.discount !== '0' && (
                <div className="flex justify-between text-[15px]">
                  <dt>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                  <dd>(-) {formatEth(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[15px]">
                <dt>Taxa de rede</dt>
                <dd className="text-[18px] leading-4">{formatEth(order.networkFee)}</dd>
              </div>
              <div className="flex justify-between font-bold leading-4">
                <dt className="text-[16px]">Total</dt>
                <dd className="text-[18px] text-text-accent" data-testid="receipt-total">
                  {formatEth(order.total)}
                </dd>
              </div>
            </dl>
            <div className="h-px bg-border" />
            <DialogDescription className="mt-3 text-center text-[14px] leading-[22px] text-text-secondary">
              Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira conectada e
              registrada na rede.
            </DialogDescription>
            {order.explorerUrl && (
              <a
                href={order.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mt-5 rounded-[5px] bg-primary p-4 text-[16px] font-bold leading-4 text-ink hover:bg-primary-hover"
              >
                Ver no Etherscan <span className="sr-only">(link simulado, abre em nova aba)</span>
              </a>
            )}
            <Link to="/" className="mx-auto mt-2 text-[14px] text-text-accent hover:underline">
              Continuar explorando
            </Link>
          </div>
          <div aria-hidden className="h-2.5 bg-primary" />
        </DialogContent>
      </Dialog>
    </main>
  )
}

function Meta({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className={bold ? 'text-[14px] font-bold leading-4' : 'text-[14px] leading-4'}>{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  )
}
