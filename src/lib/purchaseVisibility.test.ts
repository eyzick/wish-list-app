import { canTrackPurchases } from './purchaseVisibility'

test('hides purchase tracking from the list owner and on unassigned lists', () => {
  expect(canTrackPurchases('alex', 'alex')).toBe(false)
  expect(canTrackPurchases(null, 'sam')).toBe(false)
  expect(canTrackPurchases('alex', undefined)).toBe(false)
})

test('allows another signed-in member to track purchases', () => {
  expect(canTrackPurchases('alex', 'sam')).toBe(true)
})
