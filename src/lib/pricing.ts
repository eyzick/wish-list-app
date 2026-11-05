import type { WishItem } from './supabase'

export const parsePrice = (value: string): number | null | undefined => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(trimmed)) return undefined
  const price = Number(trimmed)
  return Number.isFinite(price) ? price : undefined
}

export const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

export const sortByPriceLowToHigh = (items: WishItem[]): WishItem[] =>
  [...items].sort((a, b) => {
    if (a.price === null) return b.price === null ? a.priority - b.priority : 1
    if (b.price === null) return -1
    return a.price - b.price || a.priority - b.priority
  })
