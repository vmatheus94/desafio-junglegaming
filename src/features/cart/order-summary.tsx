import { useState, type FormEvent } from 'react'
import type { Quote } from '@/shared/contracts'
import { errorMessage, isApiError } from '@/shared/api/errors'
import { formatDiscount, formatEth } from '@/shared/lib/money'
import { Skeleton } from '@/shared/ui/misc'
import { useApplyCoupon, useRemoveCoupon } from './queries'
import { cn } from '@/shared/lib/utils'

export function SummaryRows({ quote, loading, className }: { quote: Quote | undefined; loading: boolean; className?: string }) {
  if (loading || !quote) {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
        <div className="mt-3 flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }
  return (
    <dl className={cn('flex flex-col gap-3 text-[15px] text-foreground', className)} data-testid="order-summary">
      <div className="flex items-start justify-between">
        <dt>Subtotal</dt>
        <dd className="text-right text-[18px] leading-4" data-testid="summary-subtotal">
          {formatEth(quote.subtotal)}
        </dd>
      </div>
      <div className="flex items-start justify-between">
        <dt>{quote.coupon ? `Desconto (${quote.coupon.code} −${quote.coupon.percent}%)` : 'Desconto do lançamento'}</dt>
        <dd data-testid="summary-discount">{formatDiscount(quote.discount)}</dd>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="flex w-full items-center justify-between">
          <dt>Taxa de rede</dt>
          <dd className="text-right text-[18px] leading-4" data-testid="summary-fee">
            {formatEth(quote.networkFee)}
          </dd>
        </div>
        <span className="text-[12px] leading-4 text-text-accent">Taxa estimada</span>
      </div>
      <div className="mt-3 flex items-start justify-between font-bold leading-4">
        <dt className="text-[16px]">Total</dt>
        <dd className="text-right text-[18px] text-text-accent" data-testid="summary-total">
          {formatEth(quote.total)}
        </dd>
      </div>
    </dl>
  )
}

export function CouponForm({ appliedCode, compact }: { appliedCode: string | null; compact?: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('Digite um código promocional.')
      return
    }
    setError(null)
    apply.mutate(code.trim(), {
      onSuccess: () => setCode(''),
      onError: (err) => setError(isApiError(err) ? (err.fields.code ?? err.message) : errorMessage(err)),
    })
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-[3px] border border-primary px-3 py-2 text-[14px]">
        <span>
          Cupom <strong className="text-text-accent">{appliedCode}</strong> aplicado
        </span>
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          className="text-text-accent underline-offset-4 hover:underline"
        >
          Remover
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor="coupon" className={cn('text-[14px] font-bold leading-4', compact && 'sr-only')}>
        Código promocional
      </label>
      <div className={cn('flex items-center rounded-[3px] border border-primary', compact ? 'h-[50px]' : 'h-10')}>
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          maxLength={20}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent pl-2 text-[12px] text-foreground placeholder:text-secondary focus-visible:outline-none md:text-[12px]"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'h-full shrink-0 rounded-r-[3px] bg-primary text-[15px] font-bold text-ink disabled:opacity-60',
            compact ? 'w-[97px]' : 'w-[102px]',
          )}
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </form>
  )
}
