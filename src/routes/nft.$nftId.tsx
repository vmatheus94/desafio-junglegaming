import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { EditionIdSchema } from '@/shared/contracts'
import { nftQuery } from '@/features/catalog/queries'
import { NftDetailPage } from '@/features/nft/nft-detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: z.object({ edicao: EditionIdSchema.optional().catch(undefined) }),
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(nftQuery(params.nftId))
  },
  component: function NftRoute() {
    const { nftId } = Route.useParams()
    const { edicao } = Route.useSearch()
    return <NftDetailPage nftId={nftId} editionParam={edicao} />
  },
})
