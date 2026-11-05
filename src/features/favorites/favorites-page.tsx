import { Link } from '@tanstack/react-router'
import { errorMessage } from '@/shared/api/errors'
import { Button } from '@/shared/ui/button'
import { StateMessage } from '@/shared/ui/misc'
import { AccountLayout } from '@/features/account/account-layout'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavorites } from './queries'

export function FavoritesPage() {
  const { data, isPending, isError, error, refetch } = useFavorites()
  const items = data?.items?.filter((n) => data.nftIds.includes(n.id)) ?? []
  return (
    <AccountLayout title="Lista de interesse">
      <h1 className="mb-8 text-[18px] font-bold leading-4">Lista de interesse</h1>
      {isPending ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <StateMessage
          tone="error"
          title="Não foi possível carregar seus favoritos"
          description={errorMessage(error)}
          action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
        />
      ) : items.length === 0 ? (
        <StateMessage
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6">
          {items.map((n) => (
            <NftCard key={n.id} nft={n} />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
