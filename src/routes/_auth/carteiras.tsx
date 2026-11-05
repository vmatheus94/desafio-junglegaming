import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { WalletsPage } from '@/features/account/wallets-page'

export const Route = createFileRoute('/_auth/carteiras')({
  validateSearch: z.object({ voltar: z.literal('/pagamento').optional().catch(undefined) }),
  component: function WalletsRoute() {
    const { voltar } = Route.useSearch()
    return <WalletsPage back={voltar} />
  },
})
