import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '@/shared/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full min-w-0 rounded-[3px] border border-input-border bg-transparent px-3 text-[14px] text-foreground placeholder:text-secondary',
      'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      'read-only:bg-surface-card read-only:text-text-secondary disabled:opacity-60',
      'aria-[invalid=true]:border-danger',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[152px] w-full rounded-[3px] border border-input-border bg-transparent p-3 text-[14px] text-foreground placeholder:text-secondary',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-[15px] leading-[15px] text-foreground', className)} {...props} />
}

interface FieldProps {
  id: string
  label: React.ReactNode
  required?: boolean
  error?: string
  hint?: string
  className?: string
  labelClassName?: string
  children: (control: {
    id: string
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
    'aria-required': boolean | undefined
  }) => React.ReactNode
}

export function Field({ id, label, required, error, hint, className, labelClassName, children }: FieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('flex min-h-[29px] items-center gap-0.5', labelClassName)}>
        <Label htmlFor={id}>{label}</Label>
        {required && (
          <span aria-hidden className="text-[22px] leading-[29px] text-text-coral">
            *
          </span>
        )}
      </div>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-[12px] leading-4 text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-[12px] leading-4 text-danger">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}
