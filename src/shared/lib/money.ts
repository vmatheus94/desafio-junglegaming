import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN })

export type DecimalInput = string | number | Decimal

export const eth = (value: DecimalInput) => new Decimal(value)

export function addEth(...values: DecimalInput[]): string {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0)).toFixed()
}

export function mulEth(value: DecimalInput, factor: DecimalInput): string {
  return new Decimal(value).times(factor).toFixed()
}

export function subEth(a: DecimalInput, b: DecimalInput): string {
  return new Decimal(a).minus(b).toFixed()
}

export function compareEth(a: DecimalInput, b: DecimalInput): number {
  return new Decimal(a).comparedTo(b)
}

export function isZero(value: DecimalInput) {
  return new Decimal(value).isZero()
}

export function formatEth(value: DecimalInput, { unit = true }: { unit?: boolean } = {}): string {
  const d = new Decimal(value)
  let s = d.toFixed()
  const [int, frac = ''] = s.split('.')
  const trimmed = frac.replace(/0+$/, '')
  s = `${int}.${trimmed.padEnd(2, '0')}`
  return unit ? `${s} ETH` : s
}

export function formatDiscount(value: DecimalInput): string {
  const d = new Decimal(value)
  if (d.isZero()) return '(-) 00.00'
  return `(-) ${formatEth(d)}`
}

export function parseEthInput(raw: string): string | null {
  const normalized = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,18})?$/.test(normalized)) return null
  return new Decimal(normalized).toFixed()
}
