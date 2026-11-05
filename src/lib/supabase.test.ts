const mockFrom = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}))

import { loadWishItems } from './supabase'

const item = { id: 'item-1', wish_list_id: 'list-1', name: 'Gift', priority: 0 }

beforeEach(() => mockFrom.mockReset())

test('keeps visible items when purchase tracking fails', async () => {
  const order = jest.fn().mockResolvedValue({ data: [item], error: null })
  const inItems = jest.fn().mockResolvedValue({ data: null, error: { message: 'Purchase request failed' } })
  mockFrom.mockImplementation((table: string) => table === 'wish_items'
    ? { select: () => ({ eq: () => ({ order }) }) }
    : { select: () => ({ in: inItems }) })

  const result = await loadWishItems('list-1', true)

  expect(result.items).toEqual([{ ...item, is_bought: false }])
  expect(result.purchaseError).toBe(true)
  expect(inItems).toHaveBeenCalledWith('item_id', ['item-1'])
})

test('includes purchase status on another member’s list', async () => {
  const order = jest.fn().mockResolvedValue({ data: [item], error: null })
  mockFrom.mockImplementation((table: string) => table === 'wish_items'
    ? { select: () => ({ eq: () => ({ order }) }) }
    : { select: () => ({ in: jest.fn().mockResolvedValue({ data: [{ item_id: item.id, is_bought: true }], error: null }) }) })

  const result = await loadWishItems('list-1', true)

  expect(result.items).toEqual([{ ...item, is_bought: true }])
  expect(result.purchaseError).toBe(false)
})

test('does not request purchase status for the list owner', async () => {
  const order = jest.fn().mockResolvedValue({ data: [item], error: null })
  mockFrom.mockImplementation((table: string) => table === 'wish_items'
    ? { select: () => ({ eq: () => ({ order }) }) }
    : { select: () => { throw new Error('Purchase status must stay hidden') } })

  const result = await loadWishItems('list-1', false)

  expect(result.items).toEqual([{ ...item, is_bought: false }])
  expect(result.purchaseError).toBe(false)
  expect(mockFrom).toHaveBeenCalledTimes(1)
})
