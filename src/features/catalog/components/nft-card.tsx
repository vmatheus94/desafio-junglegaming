import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/money'
import { NftImage } from '@/shared/components/nft-image'
import { FavoriteToggle } from '@/features/favorites/favorite-toggle'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col gap-2 md:gap-3" aria-labelledby={`nft-${nft.id}-name`}>
      <div className="relative flex h-[200px] items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-surface-card to-surface-raised px-1 md:h-[300px] md:rounded-none md:bg-none md:bg-surface-card">
        <NftImage
          src={nft.image}
          alt={nft.imageAlt}
          sizes="(min-width: 768px) 250px, 168px"
          priority={priority}
          className={cn(
            'aspect-square w-full max-w-[168px] rounded-[16px] transition-transform duration-300 group-hover:scale-[1.02] md:max-w-[250px] md:rounded-[15px]',
            nft.soldOut && 'opacity-60 grayscale-[40%]',
          )}
        />
        {nft.badge && (
          <span className="absolute left-0 top-4 bg-primary px-2 py-2 text-[13px] font-medium leading-4 text-ink">{nft.badge}</span>
        )}
        {nft.soldOut && (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1 text-[12px] font-bold text-danger">
            ESGOTADO
          </span>
        )}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteToggle nftId={nft.id} name={nft.name} variant="card" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 pl-2 md:gap-1.5 md:pl-0">
        <h3 id={`nft-${nft.id}-name`} className="text-[15px] leading-tight text-foreground md:text-[16px] md:leading-4">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-text-accent"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-[16px] font-bold leading-4 md:text-[18px]">
          <span className="text-text-accent">
            <span className="sr-only">Preço: </span>
            {formatEth(nft.price)}
          </span>
          {nft.compareAtPrice && (
            <s className="font-normal text-secondary">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.compareAtPrice)}
            </s>
          )}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-3" aria-hidden>
      <Skeleton className="h-[200px] rounded-[20px] md:h-[300px] md:rounded-none" />
      <Skeleton className="ml-2 h-4 w-3/4 md:ml-0" />
      <Skeleton className="ml-2 h-4 w-1/3 md:ml-0" />
    </div>
  )
}
