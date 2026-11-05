import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { isApiError, errorMessage } from '@/shared/api/errors'
import { PasswordChangeInputSchema, ProfileInputSchema, type PasswordChangeInput, type ProfileInput } from '@/shared/contracts'
import { Button } from '@/shared/ui/button'
import { Field, Input } from '@/shared/ui/field'
import { Skeleton, StateMessage } from '@/shared/ui/misc'
import { announce } from '@/shared/components/live-region'
import { AccountLayout } from './account-layout'
import { useChangePassword, useProfile, useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from './queries'

const MAX_AVATAR = 1_500_000

export function ProfilePage() {
  const { data: profile, isPending, isError, error, refetch } = useProfile()
  return (
    <AccountLayout title="Perfil do colecionador">
      <h1 className="text-[18px] font-bold leading-4">Perfil do colecionador</h1>
      {isPending ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[79px]" />
          ))}
        </div>
      ) : isError ? (
        <StateMessage
          className="mt-8"
          tone="error"
          title="Não foi possível carregar seu perfil"
          description={errorMessage(error)}
          action={<Button onClick={() => refetch()}>Tentar novamente</Button>}
        />
      ) : (
        <ProfileForms key={profile.id} defaults={profile} />
      )}
    </AccountLayout>
  )
}

function ProfileForms({ defaults }: { defaults: NonNullable<ReturnType<typeof useProfile>['data']> }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const [saving, setSaving] = useState(false)

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(ProfileInputSchema),
    mode: 'onTouched',
    defaultValues: {
      displayName: defaults.displayName,
      username: defaults.username,
      email: defaults.email,
      ensName: defaults.ensName ?? '',
      walletAlias: defaults.walletAlias ?? '',
    },
  })
  const passwordForm = useForm<PasswordChangeInput>({
    resolver: zodResolver(PasswordChangeInputSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSave = async () => {
    const pwValues = passwordForm.getValues()
    const wantsPassword = Object.values(pwValues).some((v) => v)
    const profileOk = await profileForm.trigger()
    const passwordOk = wantsPassword ? await passwordForm.trigger() : true
    if (!profileOk || !passwordOk) {
      announce('Revise os campos destacados.', 'assertive')
      const firstError = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstError?.focus()
      return
    }
    setSaving(true)
    try {
      {
        await updateProfile.mutateAsync(profileForm.getValues()).catch((e) => {
          if (isApiError(e)) {
            Object.entries(e.fields).forEach(([k, msg]) => profileForm.setError(k as keyof ProfileInput, { type: 'server', message: msg }))
          }
          throw e
        })
        profileForm.reset(profileForm.getValues())
      }
      if (wantsPassword) {
        await changePassword.mutateAsync(passwordForm.getValues()).catch((e) => {
          if (isApiError(e)) {
            Object.entries(e.fields).forEach(([k, msg]) =>
              passwordForm.setError(k as keyof PasswordChangeInput, { type: 'server', message: msg }),
            )
          }
          throw e
        })
        passwordForm.reset()
      }
      toast.success(wantsPassword ? 'Perfil e senha atualizados.' : 'Perfil atualizado.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const pe = profileForm.formState.errors
  const we = passwordForm.formState.errors

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="mt-8 flex flex-col md:mt-12"
      aria-label="Perfil do colecionador"
    >
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        <Field id="pf-displayName" label="Nome de exibição" required error={pe.displayName?.message}>
          {(a) => <Input {...a} autoComplete="name" {...profileForm.register('displayName')} />}
        </Field>
        <Field id="pf-username" label="Nome de usuário" required error={pe.username?.message}>
          {(a) => <Input {...a} autoComplete="username" {...profileForm.register('username')} />}
        </Field>
        <Field id="pf-email" label="E-mail" required error={pe.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...profileForm.register('email')} />}
        </Field>
        <Field id="pf-ens" label="Nome ENS" required error={pe.ensName?.message}>
          {(a) => (
            <div className="flex gap-2.5">
              <span className="flex h-10 w-[78px] shrink-0 items-center justify-center rounded-[3px] border border-input-border text-[15px]">
                .eth
              </span>
              <Input {...a} {...profileForm.register('ensName')} />
            </div>
          )}
        </Field>
        <Field id="pf-alias" label="Apelido da carteira" required error={pe.walletAlias?.message}>
          {(a) => <Input {...a} {...profileForm.register('walletAlias')} />}
        </Field>
        <AvatarField avatarUrl={defaults.avatarUrl} name={defaults.displayName} />
      </div>

      <fieldset className="mt-8 flex flex-col gap-6">
        <legend className="mb-6 text-[16px] font-bold leading-4">Alterar senha</legend>
        <div className="flex max-w-[417px] flex-col gap-6">
          <Field id="pw-current" label="Senha atual" error={we.currentPassword?.message}>
            {(a) => <Input {...a} type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} />}
          </Field>
          <Field id="pw-new" label="Nova senha" error={we.newPassword?.message} hint="8+ caracteres com letras e números.">
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} />}
          </Field>
          <Field id="pw-confirm" label="Confirmar nova senha" error={we.confirmPassword?.message}>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} />}
          </Field>
        </div>
      </fieldset>

      <Button type="submit" className="mt-8 w-[131px]" loading={saving}>
        Salvar
      </Button>
    </form>
  )
}

function AvatarField({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const update = useUpdateAvatar()
  const remove = useRemoveAvatar()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  useEffect(() => setPreview(avatarUrl), [avatarUrl])

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError('Use uma imagem PNG, JPG ou WEBP.')
      return
    }
    if (file.size > MAX_AVATAR) {
      setError('A imagem deve ter no máximo 1,5 MB.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      update.mutate(dataUrl, {
        onSuccess: (u) => setPreview(u.avatarUrl),
        onError: (err) => setError(isApiError(err) ? (err.fields.avatar ?? err.message) : errorMessage(err)),
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <span id="avatar-label" className="text-[15px] leading-[15px]">
        Avatar
      </span>
      <div
        className="flex items-center gap-6"
        role="group"
        aria-labelledby="avatar-label"
        aria-describedby={error ? 'avatar-error' : undefined}
      >
        <span className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-input-border">
          {preview ? (
            <img src={preview} alt={`Avatar de ${name}`} className="size-full object-cover" />
          ) : (
            <ImageIcon aria-hidden className="size-6 text-secondary" />
          )}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onFile}
          tabIndex={-1}
          aria-hidden
          id="avatar-file"
        />
        <Button type="button" className="h-10 w-[98px]" onClick={() => inputRef.current?.click()} loading={update.isPending}>
          Alterar
        </Button>
        <button
          type="button"
          onClick={() => remove.mutate(undefined, { onSuccess: () => setPreview(null), onError: (e) => setError(errorMessage(e)) })}
          disabled={!preview || remove.isPending}
          className="text-[16px] font-bold text-text-accent disabled:opacity-40"
        >
          Remover
        </button>
      </div>
      {error && (
        <p id="avatar-error" role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
