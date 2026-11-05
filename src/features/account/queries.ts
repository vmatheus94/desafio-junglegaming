import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/shared/api/http-client'
import { parseWith } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { sessionStore, useSession } from '@/shared/api/session-store'
import {
  ProfileResponseSchema,
  WalletResponseSchema,
  WalletsResponseSchema,
  type PasswordChangeInput,
  type ProfileInput,
  type User,
  type WalletInput,
  type WalletSlot,
} from '@/shared/contracts'
import { announce } from '@/shared/components/live-region'

export function useProfile() {
  const session = useSession()
  const userId = session?.user.id ?? 'anonymous'
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/profile', { signal })
      return parseWith(ProfileResponseSchema, data).user
    },
    enabled: !!session,
  })
}

function useProfileMutation<V>(fn: (v: V) => Promise<User>, message: string) {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation({
    mutationFn: fn,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.profile(user.id), user)
      if (session?.user.id === user.id) sessionStore.updateUser(user)
      announce(message)
    },
  })
}

export const useUpdateProfile = () =>
  useProfileMutation(async (input: ProfileInput) => {
    const { data } = await http.patch('/profile', input)
    return parseWith(ProfileResponseSchema, data).user
  }, 'Perfil atualizado.')

export const useUpdateAvatar = () =>
  useProfileMutation(async (dataUrl: string) => {
    const { data } = await http.put('/profile/avatar', { dataUrl })
    return parseWith(ProfileResponseSchema, data).user
  }, 'Avatar atualizado.')

export const useRemoveAvatar = () =>
  useProfileMutation(async () => {
    const { data } = await http.delete('/profile/avatar')
    return parseWith(ProfileResponseSchema, data).user
  }, 'Avatar removido.')

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: PasswordChangeInput) => {
      await http.put('/profile/password', input)
    },
    onSuccess: () => announce('Senha alterada com sucesso.'),
  })
}

export function useWallets() {
  const session = useSession()
  return useQuery({
    queryKey: queryKeys.wallets(session?.user.id ?? 'anonymous'),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/wallets', { signal })
      return parseWith(WalletsResponseSchema, data).wallets
    },
    enabled: !!session,
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const session = useSession()
  return useMutation({
    mutationFn: async ({ id, slot, input }: { id?: string; slot: WalletSlot; input: WalletInput }) => {
      const { data } = id ? await http.patch(`/wallets/${id}`, input) : await http.post('/wallets', { ...input, slot })
      return parseWith(WalletResponseSchema, data).wallet
    },
    onSuccess: (wallet) => {
      const uid = session?.user.id ?? 'anonymous'
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(uid) })
      queryClient.invalidateQueries({ queryKey: queryKeys.walletConnection(uid) })
      announce(`Carteira ${wallet.slot === 'primary' ? 'principal' : 'secundária'} salva.`)
    },
  })
}
