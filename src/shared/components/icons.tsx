import { cn } from '@/shared/lib/utils'

export type FigmaIconName =
  | 'search'
  | 'cart'
  | 'cart-badge'
  | 'login'
  | 'zoom'
  | 'star'
  | 'star-half'
  | 'minus'
  | 'plus'
  | 'minus-sm'
  | 'plus-sm'
  | 'heart'
  | 'delete'
  | 'linkedin'
  | 'twitter'
  | 'message'
  | 'arrow-down'
  | 'arrow-right'
  | 'arrow-right2'
  | 'chevron-down'
  | 'close'
  | 'thank-you'
  | 'coinbase-mark'
  | 'social-1'
  | 'social-2'
  | 'social-3'
  | 'social-4'
  | 'social-5'

export function FigmaIcon({ name, className, size }: { name: FigmaIconName; className?: string; size?: number }) {
  return (
    <img
      src={`/assets/figma/${name}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn('inline-block shrink-0', className)}
      draggable={false}
    />
  )
}
