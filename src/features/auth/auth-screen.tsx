import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { toast } from 'sonner'
import { isApiError, errorMessage } from '@/shared/api/errors'
import { LoginInputSchema, RegisterInputSchema, type LoginInput, type RegisterInput } from '@/shared/contracts'
import { Button } from '@/shared/ui/button'
import { Hero } from '@/features/catalog/components/hero'
import { notAvailable } from '@/shared/components/header'
import { cn } from '@/shared/lib/utils'
import { useLogin, useRegister } from './session'
import { safeRedirect } from './redirect'

function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: Array<Path<T>>) {
  if (!isApiError(error)) return false
  let applied = false
  for (const f of fields) {
    const msg = error.fields[f as string]
    if (msg) {
      setError(f, { type: 'server', message: msg }, { shouldFocus: !applied })
      applied = true
    }
  }
  return applied
}

interface ShellProps {
  mode: 'login' | 'register'
  redirect?: string
  reason?: 'expired'
  children: ReactNode
}

function AuthShell({ mode, redirect, reason, children }: ShellProps) {
  const navigate = useNavigate()
  const close = () => navigate({ to: safeRedirect(redirect) === '/pagamento' ? '/carrinho' : safeRedirect(redirect) })
  const title = mode === 'login' ? 'Entrar' : 'Criar conta'

  return (
    <main id="conteudo">
      <title>{`${title} · Kurio`}</title>
      <div inert aria-hidden className="container-page mt-8 hidden md:block">
        <Hero />
      </div>
      <DialogPrimitive.Root open onOpenChange={(o) => !o && close()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 hidden bg-black/75 md:block" />
          <DialogPrimitive.Content
            aria-describedby="auth-subtitle"
            className={cn(
              'fixed inset-0 z-50 overflow-y-auto bg-ink focus:outline-none',
              'md:inset-auto md:left-1/2 md:top-[160px] md:max-h-[calc(100dvh-180px)] md:w-[500px] md:-translate-x-1/2 md:bg-surface-card',
            )}
          >
            <div className="mx-auto flex min-h-full max-w-[414px] flex-col px-7 pb-10 md:max-w-none md:px-0 md:pb-0">
              <div className="flex h-[136px] items-center justify-center pt-20 md:hidden">
                <span className="text-[32px] font-bold tracking-[3px] text-foreground">KURIO</span>
              </div>
              <div className="flex flex-col items-center gap-10 pt-16 md:gap-10 md:pt-12">
                <div className="flex items-center gap-2 text-[16px] font-bold leading-4">
                  <DialogPrimitive.Title asChild>
                    <h1 className="sr-only">{title}</h1>
                  </DialogPrimitive.Title>
                  <nav aria-label="Acesso à conta" className="flex items-center gap-2">
                    <Link
                      to="/entrar"
                      search={{ redirect }}
                      aria-current={mode === 'login' ? 'page' : undefined}
                      className={cn(
                        'w-[73px] text-center',
                        mode === 'login' ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
                        mode !== 'login' && 'max-md:hidden',
                      )}
                    >
                      Entrar
                    </Link>
                    <span aria-hidden className="hidden h-5 w-px bg-foreground md:block" />
                    <Link
                      to="/cadastro"
                      search={{ redirect }}
                      aria-current={mode === 'register' ? 'page' : undefined}
                      className={cn(
                        'text-center',
                        mode === 'register' ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
                        mode !== 'register' && 'max-md:hidden',
                      )}
                    >
                      <span className="md:hidden">Criar perfil de colecionador</span>
                      <span className="hidden md:inline">Criar conta</span>
                    </Link>
                  </nav>
                </div>
                <p id="auth-subtitle" className="-mt-6 hidden max-w-[404px] text-center text-[14px] leading-4 text-text-secondary md:block">
                  {mode === 'login'
                    ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
                    : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
                </p>
              </div>
              {reason === 'expired' && (
                <p
                  role="alert"
                  className="mx-auto mt-6 w-full max-w-[340px] rounded-[6px] border border-primary px-3 py-2 text-center text-[13px] text-text-accent"
                >
                  Sua sessão expirou. Entre novamente para continuar de onde parou.
                </p>
              )}
              <div className="mx-auto mt-6 w-full md:max-w-[340px]">{children}</div>
              <SocialButtons />
              <p className="mt-10 text-center text-[15px] md:hidden">
                {mode === 'login' ? (
                  <>
                    Novo na Kurio?{' '}
                    <Link to="/cadastro" search={{ redirect }} className="font-bold text-text-accent">
                      Crie uma conta
                    </Link>
                  </>
                ) : (
                  <>
                    Já tem uma conta?{' '}
                    <Link to="/entrar" search={{ redirect }} className="font-bold text-text-accent">
                      Entre
                    </Link>
                  </>
                )}
              </p>
              <div aria-hidden className="mt-6 hidden h-2.5 bg-primary md:block" />
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded text-text-accent hover:bg-surface-raised"
            >
              <span aria-hidden className="text-[22px] leading-none">
                ×
              </span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.05V24a12.1 12.1 0 0 0 3.74 0v-8.53h2.8Z"
      />
    </svg>
  )
}

function SocialButtons() {
  return (
    <div className="mx-auto mt-6 flex w-full flex-col gap-3 md:max-w-none">
      <div className="flex items-center gap-3 text-[14px] text-text-secondary">
        <span className="h-px flex-1 bg-border-soft" />
        Ou continue com
        <span className="h-px flex-1 bg-border-soft" />
      </div>
      <div className="mx-auto flex w-full flex-col gap-3 md:max-w-[340px]">
        {['Google', 'Facebook'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => notAvailable(`O login com ${p}`)}
            className="flex h-[50px] items-center justify-center gap-2 rounded-[6px] border border-border-soft text-[14px] text-foreground hover:border-primary md:h-10"
          >
            {p === 'Google' ? <GoogleMark /> : <FacebookMark />}
            Continuar com {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextInput({
  id,
  label,
  error,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-[50px] w-full rounded-[6px] border border-input-border bg-transparent px-4 text-[14px] text-foreground placeholder:text-secondary md:h-10',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 aria-[invalid=true]:border-danger',
            isPassword && 'pr-12',
          )}
          placeholder={label}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-secondary hover:text-text-accent"
          >
            {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const MOCKS_ON = import.meta.env.VITE_ENABLE_MOCKS === 'true'

export function LoginScreen({ redirect, reason }: { redirect?: string; reason?: 'expired' }) {
  const navigate = useNavigate()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema), mode: 'onTouched' })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: (s) => {
        toast.success(`Bem-vindo(a), ${s.user.displayName.split(' ')[0]}!`)
        navigate({ to: safeRedirect(redirect), replace: true })
      },
      onError: (e) => setFormError(errorMessage(e)),
    })
  })

  return (
    <AuthShell mode="login" redirect={redirect} reason={reason}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3" aria-describedby={formError ? 'login-error' : undefined}>
        {formError && (
          <p id="login-error" role="alert" className="rounded-[6px] border border-danger px-3 py-2 text-[13px] text-danger">
            {formError}
          </p>
        )}
        <TextInput
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <TextInput
          id="login-password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <button
          type="button"
          onClick={() => notAvailable('A recuperação de senha')}
          className="self-end text-[14px] text-text-accent hover:underline"
        >
          Esqueceu a senha?
        </button>
        <Button type="submit" size="xl" className="mt-6 h-[60px] w-full md:h-[45px]" loading={login.isPending}>
          Entrar
        </Button>
        {MOCKS_ON && (
          <p className="text-center text-[12px] leading-5 text-secondary">
            Demonstração: <strong className="text-text-secondary">ana@kurio.dev</strong> ou{' '}
            <strong className="text-text-secondary">bruno@kurio.dev</strong>, senha{' '}
            <strong className="text-text-secondary">Kurio@2026</strong>
          </p>
        )}
      </form>
    </AuthShell>
  )
}

export function RegisterScreen({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState, setError } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    mode: 'onTouched',
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    registerMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Conta criada! Seu perfil de colecionador está pronto.')
        navigate({ to: safeRedirect(redirect), replace: true })
      },
      onError: (e) => {
        if (!applyApiErrors(e, setError, ['username', 'email', 'password'])) setFormError(errorMessage(e))
      },
    })
  })

  return (
    <AuthShell mode="register" redirect={redirect}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        {formError && (
          <p role="alert" className="rounded-[6px] border border-danger px-3 py-2 text-[13px] text-danger">
            {formError}
          </p>
        )}
        <TextInput
          id="reg-username"
          label="Nome de usuário"
          autoComplete="username"
          error={formState.errors.username?.message}
          {...register('username')}
        />
        <TextInput
          id="reg-email"
          label="Digite seu e-mail"
          type="email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <TextInput
          id="reg-password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <TextInput
          id="reg-confirm"
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={formState.errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <p className="text-[12px] text-secondary">A senha deve ter 8 caracteres ou mais, com letras e números.</p>
        <Button type="submit" size="xl" className="mt-6 h-[60px] w-full md:h-[45px]" loading={registerMutation.isPending}>
          <span className="md:hidden">Criar perfil</span>
          <span className="hidden md:inline">Criar conta</span>
        </Button>
      </form>
    </AuthShell>
  )
}
