import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { http } from '@/shared/api/http-client'
import { errorMessage, parseWith } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { useSession } from '@/shared/api/session-store'
import { FavoritesResponseSchema } from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'

async function fetchFavorites(signal?: AbortSignal) {
  const { data } = await http.get('/favorites', { signal })
  return parseWith(FavoritesResponseSchema, data)
}

async function setFavorite(nftId: string, favorite: boolean) {
  const { data } = favorite
    ? await http.put(`/favorites/${encodeURIComponent(nftId)}`)
    : await http.delete(`/favorites/${encodeURIComponent(nftId)}`)
  return parseWith(FavoritesResponseSchema, data)
}

export function useFavorites() {
  const session = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: queryKeys.favorites(userId ?? 'anonymous'),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: !!userId,
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const session = useSession()
  const key = queryKeys.favorites(session?.user.id ?? 'anonymous')

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) => setFavorite(nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<{ nftIds: string[] }>(key)
      queryClient.setQueryData<{ nftIds: string[] }>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (error, { favorite, name }, context) => {
      queryClient.setQueryData(key, context?.previous)
      const msg = `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${name}. ${errorMessage(error)}`
      toast.error(msg)
      announce(msg, 'assertive')
    },
    onSuccess: (data, { favorite, name }) => {
      queryClient.setQueryData(key, data)
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
