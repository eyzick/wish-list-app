import React from 'react'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}))

const Account = () => {
  const { member, loading } = useAuth()
  return <div>{loading ? 'Loading account' : member ? `Signed in as ${member.name}` : 'Sign in'}</div>
}

test('opens the account when Supabase restores a session from an email confirmation link', async () => {
  const session = { user: { id: 'member-1' } }
  ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } })
  ;(supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  })
  const single = jest.fn().mockResolvedValue({
    data: { id: 'member-1', name: 'Alex', is_admin: false },
    error: null,
  })
  ;(supabase.from as jest.Mock).mockReturnValue({
    select: () => ({ eq: () => ({ single }) }),
  })

  render(<AuthProvider><Account /></AuthProvider>)

  expect(await screen.findByText('Signed in as Alex')).toBeInTheDocument()
  expect(supabase.from).toHaveBeenCalledWith('members')
})
