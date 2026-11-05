import type { WishItem } from './supabase'
import { parsePrice, sortByPriceLowToHigh } from './pricing'

test('accepts optional prices with at most two decimal places', () => {
  expect(parsePrice('')).toBeNull()
  expect(parsePrice('0')).toBe(0)
  expect(parsePrice('12.50')).toBe(12.5)
  expect(parsePrice('-1')).toBeUndefined()
  expect(parsePrice('12.345')).toBeUndefined()
})

test('sorts priced items low to high and leaves unpriced items last', () => {
  const items = [
    { id: 'unpriced', price: null, priority: 0 },
    { id: 'expensive', price: 20, priority: 1 },
    { id: 'free', price: 0, priority: 2 },
    { id: 'cheap', price: 5, priority: 3 },
  ] as WishItem[]
  expect(sortByPriceLowToHigh(items).map(item => item.id))
    .toEqual(['free', 'cheap', 'expensive', 'unpriced'])
  expect(items[0].id).toBe('unpriced')
})
