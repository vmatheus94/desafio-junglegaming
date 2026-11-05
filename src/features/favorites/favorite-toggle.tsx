import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useSession } from '@/shared/api/session-store'
import { useFavorites, useToggleFavorite } from './queries'
import { cn } from '@/shared/lib/utils'

export function FavoriteToggle({ nftId, name, variant }: { nftId: string; name: string; variant: 'card' | 'button' | 'icon' }) {
  const session = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const { data } = useFavorites()
  const toggle = useToggleFavorite()
  const isFavorite = !!data?.nftIds.includes(nftId)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!session) {
      navigate({ to: '/entrar', search: { redirect: href } })
      return
    }
    toggle.mutate({ nftId, favorite: !isFavorite, name })
  }

  const label = isFavorite ? `Remover ${name} dos favoritos` : `Favoritar ${name}`

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isFavorite}
        aria-label={label}
        className="flex h-10 w-[130px] items-center justify-center gap-2 rounded-[6px] border border-primary text-[14px] font-medium text-text-accent hover:bg-primary/10"
      >
        <Heart aria-hidden className="size-5" fill={isFavorite ? 'currentColor' : 'none'} />
        {isFavorite ? 'Favoritado' : 'Favoritar'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isFavorite}
      aria-label={label}
      className={cn(
        'grid place-items-center rounded-full text-text-accent transition-colors',
        variant === 'card' &&
          'size-8 bg-ink/80 opacity-100 hover:bg-ink md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
        variant === 'card' && isFavorite && 'md:opacity-100',
        variant === 'icon' && 'size-[35px] bg-ink/70',
      )}
    >
      <Heart aria-hidden className="size-4" fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  )
}
