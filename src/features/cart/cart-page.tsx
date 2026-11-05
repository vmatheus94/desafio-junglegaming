import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/shared/api/session-store'
import { errorMessage } from '@/shared/api/errors'
import type { CartItem, Quote } from '@/shared/contracts'
import { formatEth, mulEth } from '@/shared/lib/money'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/ui/button'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { catalogQuery } from '@/features/catalog/queries'
import { QuantityStepper } from '@/features/nft/nft-detail-page'
import { cn } from '@/shared/lib/utils'
import { useAcknowledgePrices, useCart, useQuote, useRemoveCartItem, useUpdateCartItem } from './queries'
import { CouponForm, SummaryRows } from './order-summary'

export function blockingIssues(quote: Quote | undefined) {
  return quote?.issues.filter((i) => i.code !== 'price_changed') ?? []
}

export function CartPage() {
  const session = useSession()
  const navigate = useNavigate()
  const { data: cart, isPending, isError, error, refetch, isFetching } = useCart()
  const quoteQuery = useQuote('ethereum', cart)
  const quote = quoteQuery.data
  const ack = useAcknowledgePrices()

  const items = cart?.items ?? []
  const priceChanged = items.filter((i) => i.unitPrice !== i.acceptedUnitPrice)
  const blocking = blockingIssues(quote)
  const canCheckout = items.length > 0 && !!quote && blocking.length === 0 && priceChanged.length === 0 && !quoteQuery.isFetching

  const checkout = () => {
    if (!session) navigate({ to: '/entrar', search: { redirect: '/pagamento' } })
    else navigate({ to: '/pagamento' })
  }

  return (
    <main id="conteudo" className="container-page mt-4 pb-10 md:mt-8">
      <title>Carrinho de NFTs · Kurio</title>
      <div className="mb-4 flex items-center md:hidden">
        <Link
          to="/"
          aria-label="Voltar ao início"
          className="grid size-[35px] place-items-center rounded-full bg-surface-card text-text-accent"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="flex-1 pr-[35px] text-center text-[16px] font-bold">Carrinho de NFTs</h1>
      </div>
      <nav aria-label="Trilha" className="hidden text-[15px] font-bold leading-4 md:block">
        <Link to="/">Início</Link> /{' '}
        <Link to="/" hash="catalogo">
          Mercado
        </Link>{' '}
        / <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="sr-only md:not-sr-only md:mt-0 md:hidden">Carrinho de NFTs</h1>

      {isPending ? (
        <CartSkeleton />
      ) : isError ? (
        <StateMessage
          className="mt-6"
          tone="error"
          title="Não foi possível carregar seu carrinho"
          description={errorMessage(error)}
          action={
            <Button onClick={() => refetch()} loading={isFetching}>
              Tentar novamente
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <StateMessage
          className="mt-6"
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione NFTs para colecionar."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-3 flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[782px]">
            {priceChanged.length > 0 && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-[6px] border border-primary bg-surface-card p-4 text-[14px] sm:flex-row sm:items-center"
              >
                <AlertTriangle aria-hidden className="size-5 shrink-0 text-text-accent" />
                <p className="flex-1">
                  {priceChanged.length === 1 ? 'O preço de um item mudou' : `O preço de ${priceChanged.length} itens mudou`} desde que foi
                  adicionado. Confira os novos valores antes de continuar.
                </p>
                <Button size="sm" onClick={() => ack.mutate()} loading={ack.isPending}>
                  Aceitar novos preços
                </Button>
              </div>
            )}

            <div className="hidden items-center justify-between pr-6 text-[16px] font-bold leading-4 md:flex" aria-hidden>
              <span className="w-[250px]">NFTs</span>
              <span className="w-[77px] font-medium">Preço</span>
              <span className="w-[75px]">Edições</span>
              <span className="w-[87px] font-medium">Total</span>
              <span className="w-6" />
            </div>
            <div className="hidden h-px bg-border md:block" />
            <ul className="flex flex-col gap-3 md:gap-3" aria-label="Itens do carrinho">
              {items.map((item) => (
                <CartRow
                  key={item.id}
                  item={item}
                  issue={quote?.issues.find((i) => i.itemId === item.id && i.code !== 'price_changed')?.message}
                />
              ))}
            </ul>
          </div>

          <aside aria-labelledby="summary-title" className="flex w-full flex-col gap-6 lg:w-[332px]">
            <div className="hidden flex-col gap-3 md:flex">
              <h2 id="summary-title" className="text-[18px] font-bold leading-4">
                Resumo da carteira
              </h2>
              <div className="h-px bg-border" />
            </div>
            <CouponForm appliedCode={cart.couponCode} />
            {quote?.issues.some((i) => i.code === 'coupon_expired' || i.code === 'coupon_invalid') && (
              <p role="alert" className="text-[13px] text-danger">
                {quote.issues.find((i) => i.code.startsWith('coupon'))?.message} Remova o cupom para continuar.
              </p>
            )}
            <SummaryRows quote={quote} loading={quoteQuery.isPending} />
            {quoteQuery.isError && (
              <p role="alert" className="text-[13px] text-danger">
                Não foi possível calcular os valores.{' '}
                <button type="button" className="underline" onClick={() => quoteQuery.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            <div className="flex flex-col items-center gap-3">
              <Button onClick={checkout} disabled={!canCheckout} className="h-[60px] w-full rounded-[8px] md:h-10 md:rounded-[3px]">
                Conectar e finalizar
              </Button>
              {!canCheckout && blocking.length > 0 && (
                <p className="text-center text-[12px] text-danger">Resolva os avisos do carrinho para continuar.</p>
              )}
              <Link to="/" hash="catalogo" className="text-[15px] text-text-accent hover:underline">
                Continuar explorando
              </Link>
            </div>
          </aside>
        </div>
      )}

      <AlsoViewed />
    </main>
  )
}

function CartRow({ item, issue }: { item: CartItem; issue?: string }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const max = Math.min(item.available, item.maxPerOrder)
  const changed = item.unitPrice !== item.acceptedUnitPrice

  const setQty = (quantity: number) => update.mutate({ itemId: item.id, quantity }, { onError: (e) => toast.error(errorMessage(e)) })

  return (
    <li
      className={cn('relative flex flex-col gap-2 rounded-[10px] bg-surface-card md:rounded-none', update.isPending && 'opacity-70')}
      data-testid={`cart-item-${item.nftId}`}
    >
      <div className="flex min-h-[100px] items-center gap-2 md:h-[70px] md:min-h-0 md:justify-between md:pr-6">
        <div className="flex items-center gap-2 md:w-[250px] md:gap-4">
          <NftImage
            src={item.image}
            alt={item.imageAlt}
            sizes="100px"
            size={100}
            className="size-[100px] shrink-0 rounded-[10px] md:size-[70px] md:rounded-[6px]"
          />
          <div className="flex min-w-0 flex-col gap-1.5 leading-4">
            <Link
              to="/nft/$nftId"
              params={{ nftId: item.nftId }}
              search={{ edicao: item.editionId }}
              className="truncate text-[16px] font-bold text-foreground hover:text-text-accent"
            >
              {item.name}
            </Link>
            <span className="text-[14px] text-secondary">
              <span className="md:hidden">Edição: {item.editionLabel}</span>
              <span className="hidden md:inline">ID do token: {item.tokenId}</span>
            </span>
            <span className="text-[16px] font-bold text-text-accent md:hidden">{formatEth(mulEth(item.unitPrice, item.quantity))}</span>
          </div>
        </div>
        <span className="hidden w-[77px] flex-col text-[16px] font-bold leading-4 text-text-secondary md:flex">
          {formatEth(item.unitPrice)}
          {changed && (
            <s className="text-[12px] font-normal text-secondary" aria-label={`Preço anterior ${formatEth(item.acceptedUnitPrice)}`}>
              {formatEth(item.acceptedUnitPrice)}
            </s>
          )}
        </span>
        <div className="ml-auto flex items-center gap-3 self-end pb-3 pr-3 md:ml-0 md:w-[75px] md:self-auto md:pb-0 md:pr-0">
          <QuantityStepper
            compact
            roundOnMobile
            value={item.quantity}
            max={max}
            onChange={setQty}
            disabled={update.isPending || item.available === 0}
            label={`Quantidade de ${item.name}`}
          />
        </div>
        <span className="hidden w-[87px] text-[16px] font-bold leading-4 text-text-accent md:block">
          {formatEth(mulEth(item.unitPrice, item.quantity))}
        </span>
        <button
          type="button"
          onClick={() => remove.mutate({ itemId: item.id, name: item.name })}
          disabled={remove.isPending}
          aria-label={`Remover ${item.name} do carrinho`}
          className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded text-secondary hover:text-danger md:static md:size-6"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>
      {(issue || changed) && (
        <p role="status" className="px-3 pb-2 text-[12px] text-danger md:px-4">
          {issue ?? `Preço alterado de ${formatEth(item.acceptedUnitPrice)} para ${formatEth(item.unitPrice)}.`}
        </p>
      )}
    </li>
  )
}

function CartSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:justify-between" aria-busy>
      <p className="sr-only" role="status">
        Carregando carrinho…
      </p>
      <div className="flex flex-1 flex-col gap-3 lg:max-w-[782px]">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[100px] md:h-[70px]" />
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 lg:w-[332px]">
        <Skeleton className="h-10" />
        <Skeleton className="h-40" />
        <Skeleton className="h-10" />
      </div>
    </div>
  )
}

function AlsoViewed() {
  const { data } = useQuery(catalogQuery({ tab: 'trending', sort: 'recent', page: 1, pageSize: 5 }))
  if (!data?.items.length) return null
  return (
    <section aria-labelledby="also-title" className="mt-16 hidden flex-col gap-8 md:flex md:mt-24">
      <h2 id="also-title" className="border-b border-border pb-3 text-[17px] font-bold leading-4 text-text-accent">
        Colecionadores também viram
      </h2>
      <ul className="grid grid-cols-3 gap-6 lg:grid-cols-5">
        {data.items.map((r) => (
          <li key={r.id}>
            <Link to="/nft/$nftId" params={{ nftId: r.id }} className="group flex flex-col gap-3">
              <span className="grid h-[255px] place-items-center bg-surface-card px-1">
                <NftImage
                  src={r.image}
                  alt={r.imageAlt}
                  sizes="212px"
                  size={212}
                  className="aspect-square w-full max-w-[212px] rounded-[13px]"
                />
              </span>
              <span className="text-[15px] group-hover:text-text-accent">{r.name}</span>
              <span className="-mt-2 text-[16px] font-bold leading-4 text-text-accent">{formatEth(r.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
