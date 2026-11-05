import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({
  className,
  children,
  hideClose,
  overlayClassName,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean; overlayClassName?: string }) {
  const returnFocus = React.useRef<HTMLElement | null>(null)
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn('fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in', overlayClassName)}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-surface-card text-foreground shadow-2xl focus:outline-none',
          className,
        )}
        onOpenAutoFocus={(e) => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          onOpenAutoFocus?.(e)
        }}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e)
          const el = returnFocus.current
          if (!e.defaultPrevented && el && el !== document.body && el.isConnected) {
            e.preventDefault()
            el.focus()
          }
        }}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 grid size-9 place-items-center rounded text-text-accent hover:bg-surface-raised"
            aria-label="Fechar"
          >
            <X aria-hidden className="size-[18px]" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'right' | 'bottom' | 'left' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col overflow-y-auto bg-ink text-foreground shadow-2xl focus:outline-none',
          side === 'right' && 'inset-y-0 right-0 w-[min(360px,100vw)] border-l border-border',
          side === 'left' && 'inset-y-0 left-0 w-[min(360px,100vw)] border-r border-border',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-border',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 grid size-9 place-items-center rounded text-text-accent hover:bg-surface-raised"
          aria-label="Fechar"
        >
          <X aria-hidden className="size-[18px]" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
