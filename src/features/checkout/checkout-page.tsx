import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ArrowLeft, CheckCircle2, MoreVertical, PlugZap, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { isApiError, errorMessage, type ApiError } from '@/shared/api/errors'
import { useSession } from '@/shared/api/session-store'
import {
  BuyerSchema,
  NETWORK_IDS,
  NetworkIdSchema,
  QuoteOutdatedDetailsSchema,
  WALLET_TYPES,
  WalletTypeSchema,
  type NetworkId,
  type Quote,
  type Wallet,
  type WalletType,
} from '@/shared/contracts'
import { formatEth, formatDiscount } from '@/shared/lib/money'
import { NETWORK_LABELS, NETWORK_LONG_LABELS, WALLET_TYPE_LABELS } from '@/shared/lib/labels'
import { readJson, STORAGE_KEYS, writeJson } from '@/shared/lib/storage'
import { shortAddress, cn } from '@/shared/lib/utils'
import { NftImage } from '@/shared/components/nft-image'
import { announce } from '@/shared/components/live-region'
import { Button } from '@/shared/ui/button'
import { Field, Input, Textarea } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { useAcknowledgePrices, useCart, useQuote } from '@/features/cart/queries'
import { blockingIssues } from '@/features/cart/cart-page'
import { useProfile, useWallets } from '@/features/account/queries'
import { SummaryRows } from '@/features/cart/order-summary'
import { useConnectWallet, useCreateOrder, useDisconnectWallet, useWalletConnection, type OrderSubmitPhase } from './queries'

const CheckoutFormSchema = BuyerSchema.extend({
  network: NetworkIdSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40, 'Máximo de 40 caracteres'),
  walletType: WalletTypeSchema,
  referralCode: z
    .string()
    .trim()
    .min(4, 'Informe o código de indicação')
    .max(16, 'Máximo de 16 caracteres')
    .regex(/^[A-Z0-9-]+$/i, 'Use apenas letras, números e hífen'),
  ensName: z
    .string()
    .trim()
    .min(1, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/i, 'Use apenas letras, números e hífen'),
})
type CheckoutForm = z.infer<typeof CheckoutFormSchema>

function sameValues(a: Quote, b: Quote) {
  return (
    a.total === b.total &&
    a.subtotal === b.subtotal &&
    a.discount === b.discount &&
    a.networkFee === b.networkFee &&
    a.lines.length === b.lines.length &&
    a.lines.every((l, i) => b.lines[i]?.itemId === l.itemId && b.lines[i]?.quantity === l.quantity && b.lines[i]?.unitPrice === l.unitPrice)
  )
}

export function CheckoutPage() {
  const session = useSession()
  const navigate = useNavigate()
  const userId = session!.user.id
  const { data: cart, isPending: cartPending } = useCart()
  const { data: wallets, isPending: walletsPending, isError: walletsError, error: walletsErr, refetch: refetchWallets } = useWallets()
  const { data: profile } = useProfile()
  const { data: connection } = useWalletConnection()

  const [useSecondary, setUseSecondary] = useState(false)
  const primary = wallets?.find((w) => w.slot === 'primary')
  const secondary = wallets?.find((w) => w.slot === 'secondary')
  const wallet = (useSecondary ? secondary : primary) ?? primary

  const draftKey = STORAGE_KEYS.checkoutDraft(userId)
  const form = useForm<CheckoutForm>({
    resolver: zodResolver(CheckoutFormSchema),
    mode: 'onTouched',
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      note: '',
      network: 'ethereum',
      profileName: '',
      walletType: 'metamask',
      referralCode: '',
      ensName: '',
    },
  })
  const network = useWatch({ control: form.control, name: 'network' })
  const [provider, setProvider] = useState<WalletType>('metamask')

  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current || !profile || !wallets) return
    hydrated.current = true
    const draft = readJson<Partial<CheckoutForm> & { useSecondary?: boolean; provider?: WalletType }>(draftKey, 'session')
    const w = (draft?.useSecondary ? secondary : primary) ?? primary
    if (draft?.useSecondary && secondary) setUseSecondary(true)
    form.reset({
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      note: '',
      network: w?.network ?? 'ethereum',
      profileName: w?.profileName ?? profile.username,
      walletType: w?.walletType ?? 'metamask',
      referralCode: w?.referralCode ?? '',
      ensName: w?.ensName ?? profile.ensName ?? '',
      ...Object.fromEntries(Object.entries(draft ?? {}).filter(([k]) => k !== 'useSecondary' && k !== 'provider')),
    })
    setProvider(draft?.provider ?? w?.walletType ?? 'metamask')
  }, [profile, wallets, primary, secondary, draftKey, form])

  const values = useWatch({ control: form.control })
  useEffect(() => {
    if (!hydrated.current) return
    writeJson(draftKey, { ...values, useSecondary, provider }, 'session')
  }, [values, useSecondary, provider, draftKey])

  const switchWallet = (secondaryOn: boolean) => {
    const w = secondaryOn ? secondary : primary
    setUseSecondary(secondaryOn)
    if (w) {
      form.setValue('network', w.network, { shouldDirty: true })
      form.setValue('profileName', w.profileName)
      form.setValue('walletType', w.walletType)
      form.setValue('referralCode', w.referralCode)
      form.setValue('ensName', w.ensName)
      setProvider(w.walletType)
    }
  }

  const quoteQuery = useQuote(network, cart)
  const quote = quoteQuery.data
  const connected = !!wallet && connection?.walletId === wallet.id && connection.network === network

  const [connectOpen, setConnectOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const onConfirm = form.handleSubmit(
    () => {
      if (!wallet) return
      if (!connected) setConnectOpen(true)
      else setReviewOpen(true)
    },
    () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        toast.error('Complete seu perfil do colecionador para finalizar a compra.', {
          action: { label: 'Abrir perfil', onClick: () => void navigate({ to: '/perfil' }) },
        })
      } else announce('Revise os campos destacados antes de continuar.', 'assertive')
    },
  )

  if (cartPending || walletsPending) return <CheckoutSkeleton />

  if (!cart || cart.items.length === 0) {
    return (
      <main id="conteudo" className="container-page py-10">
        <title>Pagamento · Kurio</title>
        <StateMessage
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para finalizar uma compra."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      </main>
    )
  }

  if (walletsError) {
    return (
      <main id="conteudo" className="container-page py-10">
        <title>Pagamento · Kurio</title>
        <StateMessage
          tone="error"
          title="Não foi possível carregar suas carteiras"
          description={errorMessage(walletsErr)}
          action={<Button onClick={() => refetchWallets()}>Tentar novamente</Button>}
        />
      </main>
    )
  }

  if (!primary) {
    return (
      <main id="conteudo" className="container-page py-10">
        <title>Pagamento · Kurio</title>
        <StateMessage
          title="Cadastre uma carteira para pagar"
          description="Os pagamentos usam as carteiras cadastradas na sua conta."
          action={
            <Button asChild>
              <Link to="/carteiras" search={{ voltar: '/pagamento' }}>
                Cadastrar carteira
              </Link>
            </Button>
          }
        />
      </main>
    )
  }

  const errors = form.formState.errors

  return (
    <main id="conteudo" className="container-page mt-4 md:mt-8">
      <title>Pagamento · Kurio</title>
      <div className="mb-4 flex items-center md:hidden">
        <Link
          to="/carrinho"
          aria-label="Voltar ao carrinho"
          className="grid size-[35px] place-items-center rounded-full bg-surface-card text-text-accent"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="flex-1 pr-[35px] text-center text-[16px] font-bold">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha" className="hidden text-[15px] font-bold leading-4 md:block">
        <Link to="/">Início</Link> /{' '}
        <Link to="/" hash="catalogo">
          Mercado
        </Link>{' '}
        / <span aria-current="page">Pagamento</span>
      </nav>

      <form onSubmit={onConfirm} noValidate className="mt-4 flex flex-col gap-8 md:mt-8 lg:flex-row" aria-label="Pagamento">
        <div className="order-2 hidden min-w-0 flex-1 flex-col gap-3 md:flex lg:order-1">
          <details className="group md:contents" open>
            <summary className="flex cursor-pointer items-center justify-between py-2 text-[17px] font-bold md:hidden">
              Perfil do colecionador <span className="text-[13px] font-normal text-text-accent group-open:hidden">Editar</span>
            </summary>
            <h2 className="hidden text-[17px] font-bold leading-4 md:block">Perfil do colecionador</h2>
            <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
              <Field id="co-displayName" label="Nome de exibição" required error={errors.displayName?.message}>
                {(a) => <Input {...a} autoComplete="name" {...form.register('displayName')} />}
              </Field>
              <Field id="co-username" label="Nome de usuário" required error={errors.username?.message}>
                {(a) => <Input {...a} autoComplete="username" {...form.register('username')} />}
              </Field>
              <Field id="co-network" label="Rede" required error={errors.network?.message}>
                {(a) => (
                  <Controller
                    control={form.control}
                    name="network"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as NetworkId)}>
                        <SelectTrigger {...a} onBlur={field.onBlur}>
                          <SelectValue placeholder="Selecione uma rede" />
                        </SelectTrigger>
                        <SelectContent>
                          {NETWORK_IDS.map((n) => (
                            <SelectItem key={n} value={n}>
                              {NETWORK_LABELS[n]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field id="co-profileName" label="Nome do perfil" required error={errors.profileName?.message}>
                {(a) => <Input {...a} {...form.register('profileName')} />}
              </Field>
              <Field id="co-address" label="Endereço da carteira" required hint="Carteira cadastrada · edite em Carteiras">
                {(a) => <Input {...a} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" />}
              </Field>
              <Field id="co-secondary" label="ENS ou carteira secundária" labelClassName="md:invisible">
                {(a) => (
                  <Input {...a} readOnly value={wallet?.secondaryAddress ?? ''} placeholder="ENS ou carteira secundária (opcional)" />
                )}
              </Field>
              <Field id="co-walletType" label="Tipo de carteira" required error={errors.walletType?.message}>
                {(a) => (
                  <Controller
                    control={form.control}
                    name="walletType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v as WalletType)}>
                        <SelectTrigger {...a}>
                          <SelectValue placeholder="Selecione uma carteira" />
                        </SelectTrigger>
                        <SelectContent>
                          {WALLET_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {WALLET_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field id="co-referral" label="Código de indicação" required error={errors.referralCode?.message}>
                {(a) => <Input {...a} {...form.register('referralCode')} />}
              </Field>
              <Field id="co-email" label="E-mail" required error={errors.email?.message}>
                {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
              </Field>
              <Field id="co-ens" label="Nome ENS" required error={errors.ensName?.message}>
                {(a) => (
                  <div className="flex gap-2.5">
                    <span className="flex h-10 w-[78px] shrink-0 items-center justify-center rounded-[3px] border border-input-border text-[15px]">
                      .eth
                    </span>
                    <Input {...a} {...form.register('ensName')} />
                  </div>
                )}
              </Field>
            </div>
          </details>

          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[15px]">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={useSecondary}
              onChange={(e) =>
                secondary ? switchWallet(e.target.checked) : navigate({ to: '/carteiras', search: { voltar: '/pagamento' } })
              }
            />
            <span
              aria-hidden
              className="grid size-[15px] place-items-center rounded-full border border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text-accent"
            >
              {useSecondary && <span className="size-[7px] rounded-full bg-primary" />}
            </span>
            {secondary ? `Usar outra carteira? (${secondary.alias})` : 'Usar outra carteira? Cadastre uma secundária'}
          </label>

          <div className="mt-3 flex max-w-[350px] flex-col gap-3">
            <Field id="co-note" label="Observação do colecionador (opcional)" error={errors.note?.message}>
              {(a) => <Textarea {...a} maxLength={280} {...form.register('note')} />}
            </Field>
          </div>
        </div>

        <div className="order-1 flex w-full flex-col gap-3 lg:order-2 lg:w-[405px]">
          <MobileWalletCards wallets={wallets ?? []} selectedId={wallet?.id} onSelect={(w) => switchWallet(w.slot === 'secondary')} />

          <h2 className="hidden text-[17px] font-bold leading-4 md:block">Seus NFTs</h2>
          <div className="hidden justify-between text-[16px] leading-4 md:flex" aria-hidden>
            <span className="font-bold">NFTs</span>
            <span className="font-medium">Subtotal</span>
          </div>
          <div className="hidden h-px bg-border md:block" />
          <ul className="hidden flex-col gap-3 md:flex">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.itemId} className="flex h-[70px] items-center gap-2 bg-surface-card pl-1 pr-4">
                <NftImage src={l.image} alt="" sizes="66px" size={66} className="size-[66px] rounded-[8px]" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-4">
                  <span className="truncate text-[16px] font-bold">{l.name}</span>
                  <span className="text-[14px] text-secondary">ID do token: {l.tokenId}</span>
                </span>
                <span className="text-[14px] text-text-secondary">(x {l.quantity})</span>
                <span className="ml-2 text-[18px] font-bold text-text-accent">{formatEth(l.lineTotal)}</span>
              </li>
            ))}
            {quoteQuery.isPending &&
              Array.from({ length: Math.min(cart.items.length, 3) }, (_, i) => <Skeleton key={i} className="h-[70px]" />)}
          </ul>

          <p className="hidden text-center text-[14px] md:block">
            {cart.couponCode ? (
              <>
                Cupom <strong className="text-text-accent">{cart.couponCode}</strong> aplicado ·{' '}
                <Link to="/carrinho" className="underline">
                  alterar
                </Link>
              </>
            ) : (
              <>
                Tem um código promocional?{' '}
                <Link to="/carrinho" className="text-text-accent underline-offset-4 hover:underline">
                  Aplique aqui
                </Link>
              </>
            )}
          </p>
          <SummaryRows quote={quote} loading={quoteQuery.isPending} className="hidden md:flex" />
          <QuoteIssues quote={quote} />

          <fieldset className="mt-4 flex flex-col gap-4 md:gap-5">
            <legend className="mb-4 w-full text-[17px] font-bold leading-4 md:text-center">Carteira e rede</legend>
            <div role="radiogroup" aria-label="Provedor da carteira" className="flex flex-col gap-4">
              {(['walletconnect', 'metamask', 'coinbase'] as const).map((p) => (
                <ProviderOption key={p} provider={p} checked={provider === p} onSelect={() => setProvider(p)} />
              ))}
            </div>
            <ConnectionStatus wallet={wallet} network={network} connected={connected} provider={connection?.provider} />
          </fieldset>

          <div className="mt-2 flex items-center justify-end gap-4 text-[16px] font-bold md:hidden">
            <span>Total:</span>
            <span className="text-text-accent">{quote ? formatEth(quote.total) : '—'}</span>
          </div>

          <Button type="submit" size="lg" className="h-[60px] w-full md:h-[45px]" disabled={!quote || blockingIssues(quote).length > 0}>
            Confirmar compra
          </Button>
        </div>
      </form>

      {wallet && (
        <ConnectDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          wallet={wallet}
          network={network}
          provider={provider}
          onConnected={() => {
            setConnectOpen(false)
            setReviewOpen(true)
          }}
        />
      )}
      {wallet && reviewOpen && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          wallet={wallet}
          network={network}
          provider={provider}
          buyer={form.getValues()}
          liveQuote={quote}
          refetchQuote={() => quoteQuery.refetch()}
        />
      )}
    </main>
  )
}

function QuoteIssues({ quote }: { quote: Quote | undefined }) {
  if (!quote?.issues.length) return null
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-[6px] border border-danger p-3 text-[13px] text-danger">
      {quote.issues.map((i, idx) => (
        <p key={idx} className="flex gap-2">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> {i.message}
        </p>
      ))}
      <Link to="/carrinho" className="font-bold underline">
        Revisar carrinho
      </Link>
    </div>
  )
}

function ProviderOption({ provider, checked, onSelect }: { provider: WalletType; checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        'flex h-[65px] items-center gap-3 rounded-[10px] border px-4 text-left text-[15px] md:h-[45px] md:rounded-[3px]',
        checked ? 'border-primary' : 'border-border',
      )}
    >
      <span className="grid size-4 shrink-0 place-items-center rounded-full border border-primary">
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </span>
      {provider === 'walletconnect' ? (
        <>
          <span className="md:hidden">WalletConnect</span>
          <span className="hidden h-[26px] items-center whitespace-pre rounded-[6px] border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] text-text-accent md:flex">
            {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
          </span>
          <span className="sr-only md:not-sr-only md:hidden">WalletConnect</span>
        </>
      ) : (
        WALLET_TYPE_LABELS[provider]
      )}
    </button>
  )
}

function ConnectionStatus({
  wallet,
  network,
  connected,
  provider,
}: {
  wallet: Wallet | undefined
  network: NetworkId
  connected: boolean
  provider: WalletType | undefined
}) {
  const disconnect = useDisconnectWallet()
  if (!wallet) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] bg-surface-card px-3 py-2 text-[13px]" role="status">
      {connected ? (
        <>
          <span className="flex items-center gap-2 text-success">
            <CheckCircle2 aria-hidden className="size-4" />
            Conectada via {provider ? WALLET_TYPE_LABELS[provider] : 'carteira'} · {shortAddress(wallet.address)} ·{' '}
            {NETWORK_LABELS[network]}
          </span>
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            className="shrink-0 text-text-accent underline-offset-4 hover:underline"
          >
            Desconectar
          </button>
        </>
      ) : (
        <span className="flex items-center gap-2 text-text-secondary">
          <PlugZap aria-hidden className="size-4" />
          {wallet.alias} ({shortAddress(wallet.address)}) não conectada na rede {NETWORK_LABELS[network]}. A conexão será solicitada ao
          confirmar.
        </span>
      )}
    </div>
  )
}

function MobileWalletCards({ wallets, selectedId, onSelect }: { wallets: Wallet[]; selectedId?: string; onSelect: (w: Wallet) => void }) {
  return (
    <div className="flex flex-col gap-4 md:hidden">
      <div className="flex items-center justify-between text-[16px] font-bold">
        <h2>Carteira conectada</h2>
        <Link to="/carteiras" search={{ voltar: '/pagamento' }} className="text-[14px] font-normal text-text-accent">
          Trocar carteira
        </Link>
      </div>
      <div role="radiogroup" aria-label="Carteira cadastrada" className="flex flex-col gap-5">
        {[...wallets].reverse().map((w) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={w.id === selectedId}
            onClick={() => onSelect(w)}
            className={cn(
              'relative flex h-[93px] items-start gap-4 rounded-[10px] bg-surface-card px-5 pt-4 text-left',
              w.id === selectedId && 'ring-1 ring-primary',
            )}
          >
            <span className="mt-6 grid size-4 shrink-0 place-items-center rounded-full border border-primary">
              {w.id === selectedId && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[16px] font-bold">{w.alias}</span>
              <span className="text-[14px] leading-[22px] text-text-secondary">
                {w.secondaryAddress || shortAddress(w.address)}
                <br />
                {NETWORK_LONG_LABELS[w.network]}
              </span>
            </span>
            <MoreVertical aria-hidden className="absolute right-4 top-9 size-4 text-secondary" />
          </button>
        ))}
      </div>
    </div>
  )
}

function ConnectDialog({
  open,
  onOpenChange,
  wallet,
  network,
  provider,
  onConnected,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  wallet: Wallet
  network: NetworkId
  provider: WalletType
  onConnected: () => void
}) {
  const connect = useConnectWallet()
  const [error, setError] = useState<string | null>(null)
  const respond = (approved: boolean) => {
    setError(null)
    connect.mutate(
      { walletId: wallet.id, network, provider, approved },
      {
        onSuccess: onConnected,
        onError: (e) => {
          const msg =
            isApiError(e) && e.code === 'wallet_rejected'
              ? 'Você recusou a conexão na carteira. Nenhuma cobrança foi feita.'
              : errorMessage(e)
          setError(msg)
          announce(msg, 'assertive')
        },
      },
    )
  }
  return (
    <Dialog open={open} onOpenChange={(v) => (setError(null), onOpenChange(v))}>
      <DialogContent className="p-6">
        <DialogTitle className="flex items-center gap-2 text-[17px] font-bold">
          <WalletIcon aria-hidden className="size-5 text-text-accent" /> Conectar {WALLET_TYPE_LABELS[provider]}
        </DialogTitle>
        <DialogDescription className="mt-2 text-[14px] leading-6 text-text-secondary">
          A Kurio solicita acesso à carteira <strong className="text-foreground">{wallet.alias}</strong> ({shortAddress(wallet.address)}) na
          rede <strong className="text-foreground">{NETWORK_LABELS[network]}</strong>. Esta é uma simulação: escolha como a carteira
          responde.
        </DialogDescription>
        {error && (
          <p role="alert" className="mt-4 rounded-[6px] border border-danger px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="danger" onClick={() => respond(false)} disabled={connect.isPending}>
            Recusar
          </Button>
          <Button onClick={() => respond(true)} loading={connect.isPending}>
            Aprovar conexão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDialog({
  open,
  onOpenChange,
  wallet,
  network,
  provider,
  buyer,
  liveQuote,
  refetchQuote,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  wallet: Wallet
  network: NetworkId
  provider: WalletType
  buyer: CheckoutForm
  liveQuote: Quote | undefined
  refetchQuote: () => Promise<{ data?: Quote }>
}) {
  const navigate = useNavigate()
  const ack = useAcknowledgePrices()
  const [phase, setPhase] = useState<OrderSubmitPhase>('idle')
  const createOrder = useCreateOrder(setPhase)
  const [reviewed, setReviewed] = useState<Quote | undefined>(liveQuote)
  const [changed, setChanged] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!reviewed) {
      setReviewed(liveQuote)
      return
    }
    if (liveQuote && !sameValues(reviewed, liveQuote)) {
      setChanged(liveQuote)
      announce('Os valores do pedido mudaram. Revise e confirme novamente.', 'assertive')
    }
  }, [liveQuote, reviewed])

  const priceIssues = (changed ?? reviewed)?.issues ?? []
  const blocking = priceIssues.filter((i) => i.code !== 'price_changed')

  const acceptChanges = async () => {
    setError(null)
    if ((changed ?? reviewed)?.issues.some((i) => i.code === 'price_changed')) await ack.mutateAsync()
    const { data } = await refetchQuote()
    setReviewed(data)
    setChanged(null)
  }

  const submit = () => {
    if (!reviewed || changed) return
    setError(null)
    const { displayName, username, email, note } = buyer
    createOrder.mutate(
      { quoteId: reviewed.id, walletId: wallet.id, network, buyer: { displayName, username, email, note: note || undefined } },
      {
        onSuccess: (order) => {
          onOpenChange(false)
          navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
        },
        onError: (e: ApiError) => {
          if (e.code === 'quote_outdated') {
            const parsed = QuoteOutdatedDetailsSchema.safeParse(e.details)
            if (parsed.success) setChanged(parsed.data.quote)
            refetchQuote()
            announce('Os valores do pedido mudaram. Revise e confirme novamente.', 'assertive')
            return
          }
          const msg =
            e.code === 'wallet_not_connected'
              ? 'A carteira foi desconectada. Feche e conecte novamente.'
              : e.isTransient
                ? 'Não conseguimos confirmar o envio do pedido. Seus itens continuam no carrinho; tente novamente — não haverá cobrança duplicada.'
                : e.message
          setError(msg)
          toast.error(msg)
        },
      },
    )
  }

  const shown = changed ?? reviewed
  const busy = createOrder.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-[578px] p-0" hideClose={busy} onInteractOutside={(e) => busy && e.preventDefault()}>
        <div className="flex flex-col gap-4 p-6 md:p-9">
          <DialogTitle className="text-[17px] font-bold">Revise seu pedido</DialogTitle>
          <DialogDescription className="text-[14px] text-text-secondary">
            Pagamento com {WALLET_TYPE_LABELS[provider]} · {wallet.alias} ({shortAddress(wallet.address)}) · {NETWORK_LABELS[network]}
          </DialogDescription>

          {changed && reviewed && (
            <div role="alert" className="rounded-[6px] border border-primary bg-surface-raised p-3 text-[13px]">
              <p className="font-bold text-text-accent">Os valores mudaram desde a sua revisão.</p>
              <p className="mt-1 text-text-secondary">
                Total anterior {formatEth(reviewed.total)} → novo total{' '}
                <strong className="text-foreground">{formatEth(changed.total)}</strong>.
              </p>
              {changed.issues.map((i, idx) => (
                <p key={idx} className="mt-1 text-text-secondary">
                  • {i.message}
                </p>
              ))}
            </div>
          )}

          {shown ? (
            <>
              <ul className="flex flex-col gap-2" aria-label="Itens do pedido">
                {shown.lines.map((l) => (
                  <li key={l.itemId} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="min-w-0 truncate">
                      {l.name} <span className="text-secondary">(x {l.quantity})</span>
                    </span>
                    <span className="font-bold text-text-accent">{formatEth(l.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col gap-2 border-t border-border pt-3 text-[14px]">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatEth(shown.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Desconto</dt>
                  <dd>{formatDiscount(shown.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Taxa de rede</dt>
                  <dd>{formatEth(shown.networkFee)}</dd>
                </div>
                <div className="flex justify-between text-[16px] font-bold">
                  <dt>Total</dt>
                  <dd className="text-text-accent" data-testid="review-total">
                    {formatEth(shown.total)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <Skeleton className="h-32" />
          )}

          {blocking.length > 0 && (
            <p role="alert" className="text-[13px] text-danger">
              Alguns itens não estão mais disponíveis na quantidade escolhida.{' '}
              <Link to="/carrinho" className="font-bold underline">
                Ajustar carrinho
              </Link>
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[6px] border border-danger px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          {phase === 'recovering' && (
            <p role="status" className="text-[13px] text-text-accent">
              A resposta está demorando. Verificando se o pedido já foi criado…
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Voltar
            </Button>
            {changed ? (
              <Button onClick={acceptChanges} loading={ack.isPending} disabled={blocking.length > 0}>
                Aceitar novos valores
              </Button>
            ) : (
              <Button onClick={submit} loading={busy} disabled={!reviewed || blocking.length > 0 || busy}>
                {busy ? 'Enviando pedido…' : 'Confirmar e pagar'}
              </Button>
            )}
          </div>
        </div>
        <div aria-hidden className="h-2.5 bg-primary" />
      </DialogContent>
    </Dialog>
  )
}

function CheckoutSkeleton() {
  return (
    <main id="conteudo" className="container-page mt-8" aria-busy>
      <title>Pagamento · Kurio</title>
      <p className="sr-only" role="status">
        Carregando pagamento…
      </p>
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-[69px]" />
          ))}
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-[405px]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[70px]" />
          ))}
          <Skeleton className="h-40" />
          <Skeleton className="h-[45px]" />
        </div>
      </div>
    </main>
  )
}
