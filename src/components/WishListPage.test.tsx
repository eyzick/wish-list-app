import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import WishListPage from './WishListPage'
import { useAuth } from '../contexts/AuthContext'
import { loadWishItems, supabase } from '../lib/supabase'

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
  loadWishItems: jest.fn(),
  withPurchaseStatus: jest.fn(),
}))

const list = {
  id: 'list-1', name: 'Ideas', owner_id: 'owner-1', is_public: true,
  is_christmas: false, folder_id: null, created_at: '2026-11-04', updated_at: '2026-11-04',
}
const item = {
  id: 'item-1', wish_list_id: list.id, name: 'A book', link: null, details: null,
  price: null, is_bought: false, starred: false, priority: 0,
  created_at: '2026-11-04', updated_at: '2026-11-04',
}

const from = supabase.from as jest.Mock
const loadItems = loadWishItems as jest.Mock
const auth = useAuth as jest.Mock
const deleted = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
  loadItems.mockResolvedValue({ items: [item], purchaseError: false })
  deleted.mockResolvedValue({ data: { id: item.id }, error: null })
  from.mockImplementation((table: string) => {
    if (table === 'wish_lists') return { select: () => ({ order: async () => ({ data: [list], error: null }) }) }
    if (table === 'list_folders') return { select: () => ({ order: async () => ({ data: [], error: null }) }) }
    if (table === 'wish_items') return {
      delete: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: deleted }) }) }) }),
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

afterEach(() => jest.restoreAllMocks())

const openList = async () => {
  const listButton = await screen.findByRole('button', { name: /Ideas.*Public/ })
  fireEvent.click(listButton)
  await screen.findByText('A book')
}

test('shows a loading shell while the first page request is pending', async () => {
  auth.mockReturnValue({ member: { id: 'owner-1', name: 'Owner', is_admin: false } })

  render(<WishListPage />)

  expect(screen.getByRole('status')).toHaveTextContent('Loading wish lists')
  await screen.findByRole('button', { name: /Ideas.*Public/ })
})

test('shows item placeholders while an opened list loads', async () => {
  auth.mockReturnValue({ member: { id: 'owner-1', name: 'Owner', is_admin: false } })
  let resolveItems: (value: { items: typeof item[]; purchaseError: boolean }) => void = () => {}
  loadItems.mockReturnValue(new Promise(resolve => { resolveItems = resolve }))

  render(<WishListPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Ideas.*Public/ }))

  expect(await screen.findByText(/Loading items in Ideas/)).toBeInTheDocument()
  await act(async () => resolveItems({ items: [item], purchaseError: false }))
  expect(await screen.findByText('A book')).toBeInTheDocument()
  expect(screen.queryByText('Loading items in Ideas')).not.toBeInTheDocument()
})

test('the owner can delete an item from their list', async () => {
  auth.mockReturnValue({ member: { id: 'owner-1', name: 'Owner', is_admin: false } })
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)

  render(<WishListPage />)
  await openList()
  fireEvent.click(screen.getByRole('button', { name: 'Delete A book' }))

  await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.queryByText('A book')).not.toBeInTheDocument())
  confirm.mockRestore()
})

test('another member cannot see the item delete control', async () => {
  auth.mockReturnValue({ member: { id: 'viewer-1', name: 'Viewer', is_admin: false } })

  render(<WishListPage />)
  await openList()

  expect(screen.queryByRole('button', { name: 'Delete A book' })).not.toBeInTheDocument()
})
