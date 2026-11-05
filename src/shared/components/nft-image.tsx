import { cn } from '@/shared/lib/utils'

const WIDTHS = [320, 640, 960] as const

export function nftSrcSet(src: string) {
  if (!src.endsWith('.png')) return undefined
  const base = src.slice(0, -4)
  return WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', ')
}

export function nftSrc(src: string, width: 320 | 640 | 960 = 640) {
  return src.endsWith('.png') ? `${src.slice(0, -4)}-${width}.webp` : src
}

interface Props extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string
  alt: string
  sizes: string
  priority?: boolean
  size?: number
}

export function NftImage({ src, alt, sizes, priority, className, size = 640, ...props }: Props) {
  return (
    <img
      src={nftSrc(src)}
      srcSet={nftSrcSet(src)}
      sizes={sizes}
      alt={alt}
      width={size}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      className={cn('bg-surface-raised object-cover', className)}
      draggable={false}
      {...props}
    />
  )
}
