import * as React from 'react'
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-[6px]', className)} {...props} />
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer grid size-4 shrink-0 place-items-center rounded-[3px] border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-ink',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export const RadioGroup = RadioPrimitive.Root

export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-full border border-primary',
        checked && 'after:block after:size-2 after:rounded-full after:bg-primary',
      )}
    />
  )
}

export function RadioGroupItem({ className, children, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        'flex w-full items-center gap-3 rounded-[3px] border border-border px-3 text-left text-[15px] data-[state=checked]:border-primary',
        className,
      )}
      {...props}
    >
      <span className="grid size-4 shrink-0 place-items-center rounded-full border border-primary">
        <RadioPrimitive.Indicator className="block size-2 rounded-full bg-primary" />
      </span>
      {children}
    </RadioPrimitive.Item>
  )
}

export function StateMessage({
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  tone?: 'neutral' | 'error'
  className?: string
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-col items-center gap-3 rounded-[6px] bg-surface-card px-6 py-10 text-center', className)}
    >
      <p className={cn('text-[17px] font-bold', tone === 'error' ? 'text-danger' : 'text-foreground')}>{title}</p>
      {description && <div className="max-w-md text-[14px] leading-6 text-text-secondary">{description}</div>}
      {action}
    </div>
  )
}

export function Img({ className, loading = 'lazy', decoding = 'async', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img className={cn('object-cover', className)} loading={loading} decoding={decoding} {...props} />
}
