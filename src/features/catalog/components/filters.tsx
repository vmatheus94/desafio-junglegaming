import { useEffect, useState } from 'react'
import { Slider } from 'radix-ui'
import type { CatalogResponse, CategoryId, NetworkId } from '@/shared/contracts'
import { CATEGORY_LABELS, NETWORK_LABELS } from '@/shared/lib/labels'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'
import Decimal from 'decimal.js'
import type { CatalogSearch } from '../search'

type Facets = CatalogResponse['facets']

interface FiltersProps {
  search: CatalogSearch
  facets: Facets | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

const fmt = (v: string) => new Decimal(v).toFixed(2).replace('.', ',')

export function Filters({ search, facets, onChange, className }: FiltersProps) {
  const toggle = <T extends string>(list: T[] | undefined, id: T) => {
    const set = new Set(list ?? [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    return set.size ? [...set] : undefined
  }

  return (
    <div className={cn('flex flex-col gap-10 bg-surface-card p-5', className)}>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[18px] font-bold leading-4 text-foreground">Coleções</legend>
        <ul className="px-3">
          {facets
            ? facets.categories.map((c) => (
                <FacetRow
                  key={c.id}
                  label={CATEGORY_LABELS[c.id as CategoryId]}
                  count={c.count}
                  checked={!!search.categories?.includes(c.id as CategoryId)}
                  onToggle={() => onChange({ categories: toggle(search.categories, c.id as CategoryId) })}
                />
              ))
            : Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="my-3 h-4" />)}
        </ul>
      </fieldset>

      <PriceFilter search={search} facets={facets} onChange={onChange} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[18px] font-bold leading-4 text-foreground">Rede</legend>
        <ul className="pl-3">
          {facets
            ? facets.networks.map((n) => (
                <FacetRow
                  key={n.id}
                  label={NETWORK_LABELS[n.id as NetworkId]}
                  count={n.count}
                  boldCount={false}
                  checked={!!search.networks?.includes(n.id as NetworkId)}
                  onToggle={() => onChange({ networks: toggle(search.networks, n.id as NetworkId) })}
                />
              ))
            : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="my-3 h-4" />)}
        </ul>
      </fieldset>
    </div>
  )
}

function FacetRow({
  label,
  count,
  checked,
  onToggle,
  boldCount = true,
}: {
  label: string
  count: number
  checked: boolean
  onToggle: () => void
  boldCount?: boolean
}) {
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer items-center justify-between gap-2 text-[15px] leading-10',
          checked ? 'font-bold text-text-accent' : 'text-text-secondary hover:text-foreground',
        )}
      >
        <span className="flex items-center gap-1.5">
          <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
          <span
            aria-hidden
            className={cn(
              'grid w-3 place-items-center text-[12px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text-accent',
              !checked && 'w-0',
            )}
          >
            {checked ? '✓' : ''}
          </span>
          {label}
        </span>
        <span className={cn(boldCount && 'font-bold')} aria-label={`${count} itens`}>
          ({count})
        </span>
      </label>
    </li>
  )
}

function PriceFilter({ search, facets, onChange }: Omit<FiltersProps, 'className'>) {
  const min = facets ? Number(facets.priceRange.min) : 0
  const max = facets ? Number(facets.priceRange.max) : 0
  const current: [number, number] = [search.minPrice ? Number(search.minPrice) : min, search.maxPrice ? Number(search.maxPrice) : max]
  const [value, setValue] = useState<[number, number]>(current)

  const key = `${current[0]}-${current[1]}`
  useEffect(() => {
    setValue(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const apply = () => {
    const [lo, hi] = value
    onChange({
      minPrice: lo > min ? new Decimal(lo).toFixed(2) : undefined,
      maxPrice: hi < max ? new Decimal(hi).toFixed(2) : undefined,
    })
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[18px] font-bold leading-4 text-foreground">Faixa de preço</legend>
      <div className="flex flex-col gap-3 pl-3">
        <Slider.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          min={min}
          max={max || 1}
          step={0.01}
          minStepsBetweenThumbs={1}
          value={value}
          onValueChange={(v) => setValue([v[0], v[1]] as [number, number])}
          disabled={!facets || max === 0}
        >
          <Slider.Track className="relative h-[3px] grow rounded-full bg-primary/50">
            <Slider.Range className="absolute h-full rounded-full bg-primary" />
          </Slider.Track>
          <Slider.Thumb aria-label="Preço mínimo" className="block size-[15px] rounded-full border-2 border-ink bg-primary shadow" />
          <Slider.Thumb aria-label="Preço máximo" className="block size-[15px] rounded-full border-2 border-ink bg-primary shadow" />
        </Slider.Root>
        <p className="text-[15px] text-foreground" aria-live="polite">
          Preço: {fmt(String(value[0]))} - {fmt(String(value[1]))} ETH
        </p>
        <Button size="sm" className="h-9 w-fit px-3 text-[16px]" onClick={apply} disabled={!facets}>
          Aplicar
        </Button>
      </div>
    </fieldset>
  )
}
