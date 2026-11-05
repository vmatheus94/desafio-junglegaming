import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { nftQuery } from '@/features/catalog/queries'
import { useAddToCart, useCart } from '@/features/cart/queries'
import { FavoriteToggle } from '@/features/favorites/favorite-toggle'
import { isApiError, errorMessage } from '@/shared/api/errors'
import type { Edition, EditionId, NftDetail } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/money'
import { NftImage } from '@/shared/components/nft-image'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { notAvailable } from '@/shared/components/header'
import { cn } from '@/shared/lib/utils'

export function NftDetailPage({ nftId, editionParam }: { nftId: string; editionParam?: EditionId }) {
  const { data: nft, isPending, isError, error, refetch, isFetching } = useQuery(nftQuery(nftId))

  if (isPending) return <DetailSkeleton />
  if (isError) {
    const notFound = isApiError(error) && error.kind === 'not_found'
    return (
      <main id="conteudo" className="container-page py-10">
        <title>{notFound ? 'NFT não encontrado · Kurio' : 'Erro · Kurio'}</title>
        <StateMessage
          tone={notFound ? 'neutral' : 'error'}
          title={notFound ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}
          description={notFound ? 'O NFT que você procura não existe ou foi removido do mercado.' : errorMessage(error)}
          action={
            notFound ? (
              <Button asChild>
                <Link to="/" hash="catalogo">
                  Explorar o catálogo
                </Link>
              </Button>
            ) : (
              <Button onClick={() => refetch()} loading={isFetching}>
                Tentar novamente
              </Button>
            )
          }
        />
      </main>
    )
  }
  return <NftDetailView key={nft.id} nft={nft} editionParam={editionParam} />
}

function defaultEdition(nft: NftDetail, param?: EditionId): EditionId {
  if (param && nft.editions.some((e) => e.id === param)) return param
  const preferred = nft.editions.find((e) => e.id === '1-50' && e.available > 0)
  return (preferred ?? nft.editions.find((e) => e.available > 0) ?? nft.editions[0]).id
}

function NftDetailView({ nft, editionParam }: { nft: NftDetail; editionParam?: EditionId }) {
  const navigate = useNavigate()
  const [imageIndex, setImageIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [editionId, setEditionId] = useState<EditionId>(() => defaultEdition(nft, editionParam))
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]
  const { data: cart } = useCart()
  const inCart = cart?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const maxQty = Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart)
  const [quantity, setQuantity] = useState(1)
  const addToCart = useAddToCart()

  useEffect(() => {
    if (maxQty > 0 && quantity > maxQty) setQuantity(maxQty)
    if (maxQty === 0) setQuantity(1)
  }, [maxQty, quantity])

  const selectEdition = (id: EditionId) => {
    setEditionId(id)
    setQuantity(1)
    navigate({ to: '.', search: { edicao: id }, replace: true, resetScroll: false })
  }

  const unavailable = edition.available === 0
  const limitReached = !unavailable && maxQty === 0

  const add = (goToCart: boolean) => {
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          toast.success(`${nft.name} (${edition.label}) adicionado ao carrinho.`)
          if (goToCart) navigate({ to: '/carrinho' })
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )
  }

  const image = nft.images[imageIndex] ?? nft.images[0]
  const fullStars = Math.floor(nft.rating)

  return (
    <main id="conteudo" className="pb-40 md:pb-0">
      <title>{`${nft.name} · Kurio`}</title>

      <div className="relative bg-surface-card px-7 pb-24 pt-6 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: '/' }))}
            aria-label="Voltar"
            className="grid size-[35px] place-items-center rounded-full bg-ink/70 text-text-accent"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <FavoriteToggle nftId={nft.id} name={nft.name} variant="icon" />
        </div>
        <NftImage src={image.src} alt={image.alt} sizes="361px" priority size={361} className="aspect-square w-full rounded-[24px]" />
        <Thumbs nft={nft} index={imageIndex} onSelect={setImageIndex} className="mt-3 flex justify-center gap-2" small />
      </div>

      <div className="container-page relative -mt-16 rounded-t-[32px] bg-ink pt-8 md:mt-0 md:rounded-none md:pt-0">
        <nav aria-label="Trilha" className="hidden text-[15px] font-bold leading-4 md:block">
          <ol className="flex gap-1">
            <li>
              <Link to="/" className="hover:text-text-accent">
                Início
              </Link>{' '}
              /
            </li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <div className="flex flex-col gap-8 md:mt-3 lg:flex-row">
          <div className="relative hidden gap-7 md:flex lg:h-[448px] lg:w-[573px]">
            <Thumbs nft={nft} index={imageIndex} onSelect={setImageIndex} className="flex w-[100px] shrink-0 flex-col gap-4" />
            <div className="relative grid flex-1 place-items-center rounded-[6px] bg-surface-card p-4 lg:size-[444px] lg:flex-none">
              <NftImage
                src={image.src}
                alt={image.alt}
                sizes="404px"
                priority
                size={404}
                className="aspect-square w-full max-w-[404px] rounded-[24px]"
              />
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Ampliar imagem"
                className="absolute right-3 top-3 grid size-[30px] place-items-center rounded-full bg-ink/80 text-foreground"
              >
                <ZoomIn aria-hidden className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 md:gap-3.5">
            <div className="flex flex-col gap-3 border-b border-border pb-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-[16px] font-bold leading-snug text-foreground md:text-[28px]">{nft.name}</h1>
                <span className="flex h-[27px] shrink-0 items-center gap-1 rounded-[6px] bg-surface-card px-2 text-[14px] md:hidden">
                  <Star aria-hidden className="size-3.5 fill-primary text-primary" />
                  {nft.rating.toFixed(1)} <span className="text-secondary">({nft.reviewCount})</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[22px] font-bold leading-4 text-text-accent" aria-live="polite">
                  <span className="sr-only">Preço da edição {edition.label}: </span>
                  {formatEth(edition.price)}
                </p>
                <p className="hidden items-center gap-1 text-[15px] md:flex">
                  <span className="flex gap-1" aria-hidden>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn('size-[15px] text-primary', i < fullStars ? 'fill-primary' : 'fill-primary/30')} />
                    ))}
                  </span>
                  <span className="sr-only">Nota {nft.rating.toFixed(1)} de 5.</span>
                  {nft.reviewCount} avaliações de colecionadores
                </p>
              </div>
            </div>

            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2 id="about-title" className="hidden text-[15px] font-bold leading-4 md:block">
                Sobre este NFT:
              </h2>
              <p className="text-[14px] leading-6 text-text-secondary">{nft.description}</p>
            </section>

            <EditionPicker editions={nft.editions} value={edition.id} onChange={selectEdition} />

            <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
              <QuantityStepper value={quantity} max={maxQty} onChange={setQuantity} disabled={unavailable} />
              <div className="flex gap-2">
                <Button
                  className="w-[130px] text-[14px]"
                  onClick={() => add(true)}
                  loading={addToCart.isPending}
                  disabled={unavailable || limitReached}
                >
                  {unavailable ? 'ESGOTADO' : 'COMPRAR'}
                </Button>
                <FavoriteToggle nftId={nft.id} name={nft.name} variant="button" />
              </div>
            </div>
            <AvailabilityNote edition={edition} inCart={inCart} limitReached={limitReached} />

            <dl className="flex flex-col gap-3 text-[15px] text-secondary">
              <div className="flex gap-1">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Coleção:</dt>
                <dd>{nft.collection.name}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
            <ShareRow name={nft.name} />
          </div>
        </div>

        <DetailTabs nft={nft} />
        <Related nft={nft} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-surface-card px-6 pb-6 pt-5 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">Qtd.</span>
            <QuantityStepper value={quantity} max={maxQty} onChange={setQuantity} disabled={unavailable} compact />
          </div>
          <span className="text-[16px] font-bold text-text-accent">{formatEth(edition.price)}</span>
        </div>
        <div className="mt-4 flex gap-3">
          <Button
            size="xl"
            className="flex-1"
            onClick={() => add(true)}
            loading={addToCart.isPending}
            disabled={unavailable || limitReached}
          >
            {unavailable ? 'Esgotado' : 'Comprar NFT'}
          </Button>
          <Button
            size="xl"
            variant="outline"
            className="w-[60px] px-0"
            onClick={() => add(false)}
            disabled={unavailable || limitReached || addToCart.isPending}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart aria-hidden className="size-5" />
          </Button>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[720px] bg-ink p-4" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{image.alt}</DialogTitle>
          <NftImage src={image.src} alt={image.alt} sizes="720px" size={960} className="aspect-square w-full rounded-[16px]" />
        </DialogContent>
      </Dialog>
    </main>
  )
}

function Thumbs({
  nft,
  index,
  onSelect,
  className,
  small,
}: {
  nft: NftDetail
  index: number
  onSelect: (i: number) => void
  className?: string
  small?: boolean
}) {
  return (
    <div role="group" aria-label="Galeria de imagens" className={className}>
      {nft.images.map((img, i) =>
        small ? (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ver imagem ${i + 1} de ${nft.images.length}`}
            aria-pressed={i === index}
            className="grid h-6 min-w-6 place-items-center"
          >
            <span aria-hidden className={cn('block h-2 rounded-full', i === index ? 'w-5 bg-primary' : 'w-2 bg-primary/40')} />
          </button>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ver imagem ${i + 1} de ${nft.images.length}`}
            aria-pressed={i === index}
            className={cn('overflow-hidden rounded-[8px] border', i === index ? 'border-primary' : 'border-transparent')}
          >
            <NftImage src={img.src} alt="" sizes="100px" size={100} className="size-[100px] rounded-[8px]" />
          </button>
        ),
      )}
    </div>
  )
}

function EditionPicker({ editions, value, onChange }: { editions: Edition[]; value: EditionId; onChange: (id: EditionId) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[15px] font-bold leading-4">Edição:</legend>
      <div role="radiogroup" aria-label="Edição" className="flex flex-wrap gap-1.5 md:gap-1.5">
        {editions.map((e) => {
          const selected = e.id === value
          const soldOut = e.available === 0
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Edição ${e.label}, ${formatEth(e.price)}${soldOut ? ', esgotada' : `, ${e.available} disponíveis`}`}
              onClick={() => onChange(e.id)}
              className={cn(
                'h-7 rounded-full border px-2 text-[14px] leading-4',
                selected
                  ? 'border-primary font-medium text-text-accent'
                  : 'border-transparent text-text-secondary hover:border-border-soft',
                soldOut && 'line-through decoration-danger/70',
              )}
            >
              {e.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function AvailabilityNote({ edition, inCart, limitReached }: { edition: Edition; inCart: number; limitReached: boolean }) {
  let text: string
  if (edition.available === 0) text = `A edição ${edition.label} está esgotada. Escolha outra edição.`
  else if (limitReached) text = `Você já tem ${inCart} unidade(s) desta edição no carrinho, o limite por pedido.`
  else if (edition.supply === null) text = `Edição aberta · até ${edition.maxPerOrder} por pedido.`
  else text = `${edition.available} de ${edition.supply} disponíveis · até ${Math.min(edition.available, edition.maxPerOrder)} por pedido.`
  return (
    <p className={cn('text-[13px]', edition.available === 0 || limitReached ? 'text-danger' : 'text-secondary')} aria-live="polite">
      {text}
    </p>
  )
}

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  compact,
  roundOnMobile,
  label = 'Quantidade',
}: {
  value: number
  max: number
  onChange: (v: number) => void
  disabled?: boolean
  compact?: boolean
  roundOnMobile?: boolean
  label?: string
}) {
  const shape = roundOnMobile
    ? 'grid size-7 shrink-0 place-items-center rounded-full border border-ink bg-primary text-ink shadow disabled:opacity-40 md:h-[30px] md:w-5 md:rounded-[20px]'
    : null
  const btn =
    shape ??
    (compact
      ? 'grid h-[30px] w-5 place-items-center rounded-[20px] border border-ink bg-primary text-ink shadow disabled:opacity-40'
      : 'grid h-[49.5px] w-[33px] place-items-center rounded-[33px] border border-ink bg-primary text-ink shadow disabled:opacity-40')
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Diminuir quantidade"
      >
        <Minus aria-hidden className={compact ? 'size-3.5' : 'size-5'} strokeWidth={3} />
      </button>
      <output
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className={cn('min-w-4 text-center text-foreground', compact ? 'text-[17px]' : 'text-[20px] leading-7')}
      >
        {value}
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus aria-hidden className={compact ? 'size-3.5' : 'size-5'} strokeWidth={3} />
      </button>
    </div>
  )
}

function ShareRow({ name }: { name: string }) {
  const share = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência.')
    } catch {
      toast.info(url)
    }
  }
  const text = encodeURIComponent(`${name} na Kurio`)
  return (
    <div className="flex items-center gap-2 text-[15px]">
      <span className="font-bold leading-4">Compartilhar este NFT:</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no LinkedIn (abre em nova aba)"
        className="grid size-7 place-items-center rounded hover:bg-surface-raised"
      >
        <img src="/assets/figma/linkedin.svg" alt="" width={15} height={14} />
      </a>
      <button
        type="button"
        onClick={share}
        aria-label="Copiar link"
        className="grid size-7 place-items-center rounded hover:bg-surface-raised"
      >
        <img src="/assets/figma/message.svg" alt="" width={18} height={18} />
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartilhar no Twitter (abre em nova aba)"
        className="grid size-7 place-items-center rounded hover:bg-surface-raised"
      >
        <img src="/assets/figma/twitter.svg" alt="" width={16} height={12} />
      </a>
    </div>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const paragraphs = useMemo(() => {
    const idx = nft.longDescription.indexOf(' A propriedade')
    return idx > 0 ? [nft.longDescription.slice(0, idx), nft.longDescription.slice(idx + 1)] : [nft.longDescription]
  }, [nft.longDescription])
  return (
    <section className="mt-12 flex flex-col gap-3 md:mt-24">
      <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 border-b border-border">
        {(
          [
            ['details', 'Detalhes do NFT'],
            ['reviews', `Avaliações de colecionadores (${nft.reviewCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const next = id === 'details' ? 'reviews' : 'details'
                setTab(next)
                document.getElementById(`tab-${next}`)?.focus()
              }
            }}
            className={cn(
              'relative pb-3 text-[15px] leading-4 md:text-[17px]',
              tab === id
                ? 'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary'
                : 'text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'details' ? (
        <div
          role="tabpanel"
          id="panel-details"
          aria-labelledby="tab-details"
          className="flex flex-col text-[14px] leading-6 text-text-secondary"
        >
          {paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? 'mt-6' : undefined}>
              {p}
            </p>
          ))}
          <h2 className="mt-3 font-bold text-foreground">Rede:</h2>
          <p>
            Cunhado na {nft.networkLabel.replace('Rede ', '').replace(' Mainnet', '')} com procedência imutável e metadados armazenados no
            IPFS.
          </p>
          <h2 className="mt-3 font-bold text-foreground">Contrato:</h2>
          <p>
            Direitos autorais do criador: {nft.creator.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados
            compatíveis.
          </p>
          <h2 className="mt-3 font-bold text-foreground">Direitos autorais:</h2>
          <p className="break-all">
            {nft.contract.address.slice(0, 6)}...{nft.contract.address.slice(-4)} • Contrato inteligente {nft.contract.standard} verificado.
          </p>
        </div>
      ) : (
        <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" className="text-[14px] leading-6 text-text-secondary">
          <p>
            Nota média {nft.rating.toFixed(1)} de 5 em {nft.reviewCount} avaliações.{' '}
            <button
              type="button"
              className="text-text-accent underline-offset-4 hover:underline"
              onClick={() => notAvailable('A leitura de avaliações')}
            >
              Ver avaliações
            </button>
          </p>
        </div>
      )}
    </section>
  )
}

function Related({ nft }: { nft: NftDetail }) {
  if (!nft.related.length) return null
  return (
    <section aria-labelledby="related-title" className="mt-12 flex flex-col gap-8 md:mt-24">
      <h2 id="related-title" className="border-b border-border pb-3 text-[17px] font-bold leading-4 text-text-accent">
        Mais desta coleção
      </h2>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-5">
        {nft.related.map((r) => (
          <li key={r.id} className="w-[180px] shrink-0 snap-start md:w-auto">
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
              <span className="flex flex-col">
                <span className="text-[15px] text-foreground group-hover:text-text-accent">{r.name}</span>
                <span className="text-[16px] font-bold leading-4 text-text-accent">{formatEth(r.price)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <main id="conteudo" aria-busy className="container-page min-h-[100dvh]">
      <title>Carregando NFT · Kurio</title>
      <p className="sr-only" role="status">
        Carregando NFT…
      </p>
      <Skeleton className="mt-4 aspect-square w-full rounded-[24px] md:hidden" />
      <div className="hidden md:mt-7 md:flex md:gap-8">
        <div className="flex gap-7">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-[100px]" />
            ))}
          </div>
          <Skeleton className="size-[444px]" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-7 w-1/2" />
      </div>
    </main>
  )
}
