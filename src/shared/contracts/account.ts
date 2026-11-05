import { z } from 'zod'
import { IsoDateSchema } from './common'
import { NetworkIdSchema, NftSummarySchema } from './nft'

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  ensName: z.string().nullable(),
  walletAlias: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof UserSchema>

export const SessionSchema = z.object({
  user: UserSchema,
  token: z.string(),
  expiresAt: IsoDateSchema,
})
export type Session = z.infer<typeof SessionSchema>

export const SessionInfoSchema = z.object({ user: UserSchema, expiresAt: IsoDateSchema })

const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(64, 'A senha deve ter no máximo 64 caracteres')
  .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra')
  .regex(/\d/, 'Inclua pelo menos um número')

export const LoginInputSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginInput = z.infer<typeof LoginInputSchema>

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9_.]+$/i, 'Use apenas letras, números, ponto ou _')

export const RegisterInputSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
    password,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterInput = z.infer<typeof RegisterInputSchema>

export const ProfileInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe seu nome de exibição').max(40, 'Máximo de 40 caracteres'),
  username: usernameSchema,
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  ensName: z
    .string()
    .trim()
    .min(1, 'Informe o nome ENS')
    .max(40, 'Máximo de 40 caracteres')
    .regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
  walletAlias: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Máximo de 32 caracteres'),
})
export type ProfileInput = z.infer<typeof ProfileInputSchema>

export const PasswordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type PasswordChangeInput = z.infer<typeof PasswordChangeInputSchema>

export const AvatarInputSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Use uma imagem PNG, JPG ou WEBP'),
})

export const ProfileResponseSchema = z.object({ user: UserSchema })

export const WALLET_TYPES = ['metamask', 'walletconnect', 'coinbase'] as const
export const WalletTypeSchema = z.enum(WALLET_TYPES)
export type WalletType = z.infer<typeof WalletTypeSchema>

export const WalletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof WalletSlotSchema>

const ethAddress = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido (0x seguido de 40 caracteres hexadecimais)')

export const WalletInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Máximo de 40 caracteres'),
  alias: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Máximo de 32 caracteres'),
  network: NetworkIdSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40, 'Máximo de 40 caracteres'),
  address: ethAddress,
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(v), {
      message: 'Use um endereço 0x ou um nome .eth',
    }),
  walletType: WalletTypeSchema,
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16, 'Máximo de 16 caracteres')
    .regex(/^[A-Z0-9-]+$/i, 'Use apenas letras, números e hífen'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  ensName: z
    .string()
    .trim()
    .min(1, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
})
export type WalletInput = z.infer<typeof WalletInputSchema>

export const WalletSchema = WalletInputSchema.extend({
  id: z.string(),
  slot: WalletSlotSchema,
  updatedAt: IsoDateSchema,
})
export type Wallet = z.infer<typeof WalletSchema>

export const WalletsResponseSchema = z.object({ wallets: z.array(WalletSchema) })
export const WalletResponseSchema = z.object({ wallet: WalletSchema })

export const WalletConnectionSchema = z.object({
  walletId: z.string(),
  network: NetworkIdSchema,
  provider: WalletTypeSchema,
  address: z.string(),
  connectedAt: IsoDateSchema,
})
export type WalletConnection = z.infer<typeof WalletConnectionSchema>
export const WalletConnectionResponseSchema = z.object({ connection: WalletConnectionSchema })

export const FavoritesResponseSchema = z.object({
  nftIds: z.array(z.string()),
  items: z.array(NftSummarySchema).optional(),
})
export type FavoritesResponse = z.infer<typeof FavoritesResponseSchema>
