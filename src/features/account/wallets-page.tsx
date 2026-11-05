import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { isApiError, errorMessage } from '@/shared/api/errors'
import { NETWORK_IDS, WALLET_TYPES, WalletInputSchema, type Wallet, type WalletInput, type WalletSlot } from '@/shared/contracts'
import { NETWORK_LABELS, WALLET_TYPE_LABELS } from '@/shared/lib/labels'
import { useSession } from '@/shared/api/session-store'
import { Button } from '@/shared/ui/button'
import { Field, Input } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { announce } from '@/shared/components/live-region'
import { AccountLayout } from './account-layout'
import { useSaveWallet, useWallets } from './queries'

const EMPTY: WalletInput = {
  displayName: '',
  alias: '',
  network: 'ethereum',
  profileName: '',
  address: '',
  secondaryAddress: '',
  walletType: 'metamask',
  referralCode: '',
  email: '',
  ensName: '',
}

function toInput(w: Wallet): WalletInput {
  const { id: _i, slot: _s, updatedAt: _u, ...rest } = w
  return rest
}

export function WalletsPage({ back }: { back?: string }) {
  const { data: wallets, isPending, isError, error, refetch } = useWallets()
  const primary = wallets?.find((w) => w.slot === 'primary')
  const secondary = wallets?.find((w) => w.slot === 'secondary')
  const [addingPrimary, setAddingPrimary] = useState(false)
  const [addingSecondary, setAddingSecondary] = useState(false)
  const [secondaryFromPrimary, setSecondaryFromPrimary] = useState(false)

  return (
    <AccountLayout title="Carteiras">
      {back && (
        <Link to={back} className="mb-4 inline-block text-[14px] text-text-accent underline-offset-4 hover:underline">
          ← Voltar ao pagamento
        </Link>
      )}
      {isPending ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-[65px]" />
          ))}
        </div>
      ) : isError ? (
        <StateMessage
          tone="error"
          title="Não foi possível carregar suas carteiras"
          description={errorMessage(error)}
          action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="primary-title" className="flex flex-col gap-8">
            <header className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h1 id="primary-title" className="text-[18px] font-bold leading-4">
                  Carteira principal
                </h1>
                {!primary && !addingPrimary && (
                  <button type="button" onClick={() => setAddingPrimary(true)} className="text-[16px] font-bold text-text-accent">
                    Adicionar
                  </button>
                )}
              </div>
              <p className="text-[15px] leading-[15px] text-text-secondary">
                Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
              </p>
            </header>
            {primary || addingPrimary ? (
              <WalletForm
                key={primary?.id ?? 'new-primary'}
                slot="primary"
                wallet={primary}
                defaults={primary ? toInput(primary) : EMPTY}
              />
            ) : (
              <p className="text-[15px] text-text-secondary">Você ainda não adicionou uma carteira principal.</p>
            )}
          </section>

          <section aria-labelledby="secondary-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="secondary-title" className="text-[18px] font-bold leading-4">
                Carteira secundária
              </h2>
              {!secondary && primary && (
                <div className="flex items-center gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-[16px]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={secondaryFromPrimary}
                      onChange={(e) => {
                        setSecondaryFromPrimary(e.target.checked)
                        setAddingSecondary(true)
                      }}
                    />
                    <span
                      aria-hidden
                      className="grid size-4 place-items-center rounded-full border border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-text-accent"
                    >
                      {secondaryFromPrimary && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    Igual à carteira principal
                  </label>
                  {!addingSecondary && (
                    <button type="button" onClick={() => setAddingSecondary(true)} className="text-[16px] font-bold text-text-accent">
                      Adicionar
                    </button>
                  )}
                </div>
              )}
            </div>
            {secondary ? (
              <WalletForm key={secondary.id} slot="secondary" wallet={secondary} defaults={toInput(secondary)} />
            ) : addingSecondary && primary ? (
              <WalletForm
                key={secondaryFromPrimary ? 'copy' : 'blank'}
                slot="secondary"
                defaults={secondaryFromPrimary ? { ...toInput(primary), address: '', secondaryAddress: '', alias: '' } : EMPTY}
                hint={
                  secondaryFromPrimary
                    ? 'Dados copiados da carteira principal. Informe o endereço e o apelido da carteira secundária.'
                    : undefined
                }
              />
            ) : (
              <p className="text-[15px] text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>
            )}
          </section>
        </div>
      )}
    </AccountLayout>
  )
}

function WalletForm({ slot, wallet, defaults, hint }: { slot: WalletSlot; wallet?: Wallet; defaults: WalletInput; hint?: string }) {
  const session = useSession()
  const save = useSaveWallet()
  const form = useForm<WalletInput>({
    resolver: zodResolver(WalletInputSchema),
    mode: 'onTouched',
    defaultValues: { ...defaults, email: defaults.email || session?.user.email || '' },
  })
  const e = form.formState.errors
  const p = slot === 'primary' ? 'wp' : 'ws'

  const onSubmit = form.handleSubmit(
    (values) =>
      save.mutate(
        { id: wallet?.id, slot, input: values },
        {
          onSuccess: (w) => {
            form.reset(toInput(w))
            toast.success(`Carteira ${slot === 'primary' ? 'principal' : 'secundária'} salva.`)
          },
          onError: (err) => {
            if (isApiError(err) && Object.keys(err.fields).length) {
              Object.entries(err.fields).forEach(([k, msg]) => form.setError(k as keyof WalletInput, { type: 'server', message: msg }))
            } else toast.error(errorMessage(err))
          },
        },
      ),
    () => announce('Revise os campos destacados da carteira.', 'assertive'),
  )

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={`Carteira ${slot === 'primary' ? 'principal' : 'secundária'}`}
      className="flex flex-col gap-8"
    >
      {hint && <p className="text-[13px] text-text-accent">{hint}</p>}
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <Field id={`${p}-displayName`} label="Nome de exibição" required error={e.displayName?.message}>
          {(a) => <Input {...a} {...form.register('displayName')} />}
        </Field>
        <Field id={`${p}-alias`} label="Apelido da carteira" required error={e.alias?.message}>
          {(a) => <Input {...a} {...form.register('alias')} />}
        </Field>
        <Field id={`${p}-network`} label="Rede" required error={e.network?.message}>
          {(a) => (
            <Controller
              control={form.control}
              name="network"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...a}>
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
        <Field id={`${p}-profileName`} label="Nome do perfil" required error={e.profileName?.message}>
          {(a) => <Input {...a} {...form.register('profileName')} />}
        </Field>
        <Field id={`${p}-address`} label="Endereço da carteira" required error={e.address?.message}>
          {(a) => (
            <Input {...a} placeholder="Endereço 0x da carteira" spellCheck={false} autoComplete="off" {...form.register('address')} />
          )}
        </Field>
        <Field
          id={`${p}-secondaryAddress`}
          label="ENS ou carteira secundária (opcional)"
          labelClassName="md:invisible"
          error={e.secondaryAddress?.message}
        >
          {(a) => (
            <Input {...a} placeholder="ENS ou carteira secundária (opcional)" spellCheck={false} {...form.register('secondaryAddress')} />
          )}
        </Field>
        <Field id={`${p}-walletType`} label="Tipo de carteira" required error={e.walletType?.message}>
          {(a) => (
            <Controller
              control={form.control}
              name="walletType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
        <Field id={`${p}-referral`} label="Código de indicação" required error={e.referralCode?.message}>
          {(a) => <Input {...a} {...form.register('referralCode')} />}
        </Field>
        <Field id={`${p}-email`} label="E-mail" required error={e.email?.message}>
          {(a) => <Input {...a} type="email" {...form.register('email')} />}
        </Field>
        <Field id={`${p}-ens`} label="Nome ENS" required error={e.ensName?.message}>
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
      <Button type="submit" className="w-fit min-w-[131px]" loading={save.isPending}>
        Salvar carteira
      </Button>
    </form>
  )
}
