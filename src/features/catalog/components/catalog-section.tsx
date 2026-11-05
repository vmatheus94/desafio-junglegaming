import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X, Search } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { CATALOG_SORTS, CATALOG_TABS } from '@/shared/contracts'
import { CATEGORY_LABELS, NETWORK_LABELS, SORT_LABELS, TAB_LABELS } from '@/shared/lib/labels'
import { errorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogTitle, SheetContent } from '@/shared/ui/dialog'
import { StateMessage } from '@/shared/ui/misc'
import { NftImage } from '@/shared/components/nft-image'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { catalogQuery } from '../queries'
import { toCatalogQuery, withFilters, type CatalogSearch } from '../search'
import { Filters } from './filters'
import { NftCard, NftCardSkeleton } from './nft-card'
import { HeroMobile } from './hero'

export function CatalogSection({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate({ from: '/' })
  const params = toCatalogQuery(search)
  const query = useQuery(catalogQuery(params))
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = query
  const [filtersOpen, setFiltersOpen] = useState(false)

  const update = (patch: Partial<CatalogSearch>, resetPage = true) =>
    navigate({
      search: (prev) => (resetPage ? withFilters(prev, patch) : { ...prev, ...patch }),
      hash: 'catalogo',
      resetScroll: false,
    })

  const hasFilters = !!(search.q || search.categories || search.networks || search.minPrice || search.maxPrice)
  const refreshing = isFetching && !isPending

  return (
    <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-6">
      <MobileSearch search={search} onSearch={(q) => update({ q })} onOpenFilters={() => setFiltersOpen(true)} />
      <HeroMobile />
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="flex gap-12">
        <aside aria-label="Filtros e destaque" className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
          <Filters search={search} facets={data?.facets} onChange={(p) => update(p)} />
          <FeaturedBanner featured={data?.featured ?? null} loading={isPending} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8 lg:gap-[88px]">
          <div className="flex flex-col gap-6 md:gap-8">
            <Toolbar
              search={search}
              onTab={(tab) => update({ tab: tab === 'all' ? undefined : tab })}
              onSort={(sort) => update({ sort: sort === 'recent' ? undefined : sort })}
              onOpenFilters={() => setFiltersOpen(true)}
            />

            {hasFilters && (
              <ActiveFilters
                search={search}
                total={data?.total}
                onClear={() => navigate({ search: {}, hash: 'catalogo', resetScroll: false })}
                onRemove={update}
              />
            )}

            <p className="sr-only" role="status" aria-live="polite">
              {isPending ? 'Carregando NFTs…' : refreshing ? 'Atualizando resultados…' : data ? `${data.total} NFTs encontrados.` : ''}
            </p>

            {isPending ? (
              <Grid>
                {Array.from({ length: 9 }, (_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </Grid>
            ) : isError ? (
              <StateMessage
                tone="error"
                title="Não foi possível carregar o catálogo"
                description={errorMessage(error)}
                action={
                  <Button onClick={() => refetch()} loading={isFetching}>
                    Tentar novamente
                  </Button>
                }
              />
            ) : data.items.length === 0 ? (
              <StateMessage
                title="Nenhum NFT encontrado"
                description="Ajuste a busca ou os filtros para ver mais resultados."
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={() => navigate({ search: {}, hash: 'catalogo', resetScroll: false })}>
                      Limpar filtros
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className={cn('relative transition-opacity', isPlaceholderData && 'opacity-60')} aria-busy={refreshing}>
                {refreshing && (
                  <span className="absolute -top-6 right-0 text-[12px] text-secondary" aria-hidden>
                    Atualizando…
                  </span>
                )}
                <Grid>
                  {data.items.map((nft, i) => (
                    <NftCard key={nft.id} nft={nft} priority={i < 2} />
                  ))}
                </Grid>
              </div>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPage={(page) => update({ page: page === 1 ? undefined : page }, false)}
            />
          )}
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" aria-describedby={undefined}>
          <DialogTitle className="px-5 pb-2 pt-5 text-[18px] font-bold">Filtros</DialogTitle>
          <Filters search={search} facets={data?.facets} onChange={(p) => update(p)} className="bg-transparent" />
          <div className="sticky bottom-0 mt-auto border-t border-border bg-ink p-4">
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Ver {data?.total ?? ''} resultados
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-[72px] lg:grid-cols-2 xl:grid-cols-3 xl:gap-x-[34px] [&>*:nth-child(even)]:mt-8 md:[&>*:nth-child(even)]:mt-0">
      {children}
    </div>
  )
}

function Toolbar({
  search,
  onTab,
  onSort,
  onOpenFilters,
}: {
  search: CatalogSearch
  onTab: (t: (typeof CATALOG_TABS)[number]) => void
  onSort: (s: (typeof CATALOG_SORTS)[number]) => void
  onOpenFilters: () => void
}) {
  const tab = search.tab ?? 'all'
  const sort = search.sort ?? 'recent'
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Abas do catálogo" className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 md:gap-5">
        {CATALOG_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => onTab(t)}
            className={cn(
              'relative whitespace-nowrap pb-1.5 text-[14px] leading-4 md:text-[15px] md:font-medium',
              tab === t
                ? 'font-bold text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-foreground',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className="hidden items-center gap-2 rounded-[6px] border border-primary px-3 py-1.5 text-[14px] text-text-accent md:flex lg:hidden"
        >
          <SlidersHorizontal aria-hidden className="size-4" /> Filtros
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className="flex items-center gap-1 text-[14px] text-foreground md:text-[15px]"
            aria-label={`Ordenar por: ${SORT_LABELS[sort]}`}
          >
            <span className="hidden sm:inline">Ordenar por:</span> {SORT_LABELS[sort]}
            <ChevronDown aria-hidden className="size-4 text-text-accent" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[220px] rounded-[6px] border border-border-soft bg-surface-card p-1 text-[14px] shadow-xl"
            >
              <DropdownMenu.RadioGroup value={sort} onValueChange={(v) => onSort(v as (typeof CATALOG_SORTS)[number])}>
                {CATALOG_SORTS.map((s) => (
                  <DropdownMenu.RadioItem
                    key={s}
                    value={s}
                    className="flex h-9 cursor-pointer items-center rounded px-3 outline-none data-[highlighted]:bg-surface-raised data-[state=checked]:text-text-accent"
                  >
                    {SORT_LABELS[s]}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}

function ActiveFilters({
  search,
  total,
  onClear,
  onRemove,
}: {
  search: CatalogSearch
  total: number | undefined
  onClear: () => void
  onRemove: (patch: Partial<CatalogSearch>) => void
}) {
  const chips: Array<{ label: string; patch: Partial<CatalogSearch> }> = []
  if (search.q) chips.push({ label: `“${search.q}”`, patch: { q: undefined } })
  search.categories?.forEach((c) =>
    chips.push({ label: CATEGORY_LABELS[c], patch: { categories: search.categories!.filter((x) => x !== c) || undefined } }),
  )
  search.networks?.forEach((n) =>
    chips.push({ label: NETWORK_LABELS[n], patch: { networks: search.networks!.filter((x) => x !== n) || undefined } }),
  )
  if (search.minPrice || search.maxPrice)
    chips.push({
      label: `${search.minPrice ?? '0'} – ${search.maxPrice ?? '∞'} ETH`,
      patch: { minPrice: undefined, maxPrice: undefined },
    })
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      {total !== undefined && <span className="mr-1 text-secondary">{total} resultado(s)</span>}
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() =>
            onRemove(Object.fromEntries(Object.entries(c.patch).map(([k, v]) => [k, Array.isArray(v) && v.length === 0 ? undefined : v])))
          }
          className="flex items-center gap-1 rounded-full border border-border-soft px-3 py-1 text-text-secondary hover:border-primary hover:text-text-accent"
          aria-label={`Remover filtro ${c.label}`}
        >
          {c.label} <X aria-hidden className="size-3" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="ml-1 text-text-accent underline-offset-4 hover:underline">
        Limpar filtros
      </button>
    </div>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = paginationRange(page, totalPages)
  const box = 'grid size-[35px] place-items-center rounded-[4px] text-[18px] leading-4'
  return (
    <nav aria-label="Paginação" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <button type="button" onClick={() => onPage(page - 1)} className={cn(box, 'border border-border')} aria-label="Página anterior">
              <ChevronLeft aria-hidden className="size-[18px]" />
            </button>
          </li>
        )}
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-secondary">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
                className={cn(
                  box,
                  p === page ? 'bg-primary font-bold text-ink' : 'border border-border text-foreground hover:border-primary',
                )}
              >
                {p}
              </button>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <button type="button" onClick={() => onPage(page + 1)} className={cn(box, 'border border-border')} aria-label="Próxima página">
              <ChevronRight aria-hidden className="size-[18px]" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

export function paginationRange(page: number, total: number): Array<number | '…'> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (page <= 3) return [1, 2, 3, 4, '…', total]
  if (page >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total]
  return [1, '…', page - 1, page, page + 1, '…', total]
}

function FeaturedBanner({ featured, loading }: { featured: import('@/shared/contracts').NftSummary | null; loading: boolean }) {
  if (!featured && !loading) return null
  return (
    <div className="relative flex h-[470px] flex-col gap-4 overflow-hidden bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6">
      <span aria-hidden className="absolute left-4 top-[299px] size-[22px] rounded-[7px] border-2 border-[#46a358] opacity-20" />
      <span
        aria-hidden
        className="absolute left-[248px] top-[343px] size-[45px] rounded-[29px] bg-[linear-gradient(145deg,rgba(210,138,76,0.3)_46%,rgba(210,138,76,0)_103%)]"
      />
      <p className="px-5 text-[24px] font-bold leading-8 text-text-accent">NFT EM DESTAQUE</p>
      <p className="px-5 text-center text-[22px] font-bold leading-4 text-foreground">OFERTA LIMITADA</p>
      {featured ? (
        <Link
          to="/nft/$nftId"
          params={{ nftId: featured.id }}
          className="group relative mt-2 block"
          aria-label={`Ver destaque: ${featured.name}, ${formatEth(featured.price)}`}
        >
          <NftImage src={featured.image} alt={featured.imageAlt} sizes="310px" size={310} className="h-[368px] w-full rounded-[22px]" />
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-[13px] font-bold text-text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {featured.name} · {formatEth(featured.price)}
          </span>
        </Link>
      ) : (
        <div className="skeleton mt-2 h-[368px] w-full rounded-[22px]" aria-hidden />
      )}
    </div>
  )
}

function MobileSearch({
  search,
  onSearch,
  onOpenFilters,
}: {
  search: CatalogSearch
  onSearch: (q: string | undefined) => void
  onOpenFilters: () => void
}) {
  const [term, setTerm] = useState(search.q ?? '')
  useEffect(() => setTerm(search.q ?? ''), [search.q])
  useEffect(() => {
    const value = term.trim() || undefined
    if (value === search.q) return
    const t = setTimeout(() => onSearch(value), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  return (
    <div className="mb-4 flex gap-2 md:hidden">
      <form
        role="search"
        onSubmit={(e) => (e.preventDefault(), onSearch(term.trim() || undefined))}
        className="flex h-[45px] flex-1 items-center gap-2 rounded-[10px] bg-surface-card px-3"
      >
        <Search aria-hidden className="size-[22px] text-secondary" />
        <label htmlFor="mobile-search" className="sr-only">
          Buscar NFTs
        </label>
        <input
          id="mobile-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Explorar coleções"
          maxLength={80}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-bold text-foreground placeholder:text-secondary focus-visible:outline-none"
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="grid size-[45px] place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgba(210,138,76,0.45)_25%,#d28a4c_100%)] text-ink"
      >
        <SlidersHorizontal aria-hidden className="size-[22px]" />
      </button>
    </div>
  )
}
