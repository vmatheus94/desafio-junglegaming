import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-ink hover:bg-primary-hover',
        outline: 'border border-primary text-text-accent hover:bg-primary/10',
        ghost: 'text-foreground hover:bg-surface-raised',
        link: 'text-text-accent underline-offset-4 hover:underline font-normal',
        danger: 'border border-danger text-danger hover:bg-danger/10',
      },
      size: {
        sm: 'h-[35px] rounded-[6px] px-3 text-[14px]',
        md: 'h-10 rounded-[6px] px-5 text-[15px] leading-4',
        lg: 'h-[45px] rounded-[8px] px-4 text-[15px] leading-4',
        xl: 'h-[60px] rounded-[8px] px-6 text-[16px]',
        icon: 'size-10 rounded-[6px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
