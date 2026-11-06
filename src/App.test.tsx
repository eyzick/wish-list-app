import React from 'react'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

jest.mock('./contexts/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('./components/LoginPage', () => () => <div>Sign in</div>)

const mockAuth = useAuth as jest.MockedFunction<typeof useAuth>
const child = <div>Private wish lists</div>

test('asks a signed-out visitor to sign in', () => {
  mockAuth.mockReturnValue({ member: null, loading: false } as ReturnType<typeof useAuth>)
  render(<ProtectedRoute>{child}</ProtectedRoute>)
  expect(screen.getByText('Sign in')).toBeInTheDocument()
  expect(screen.queryByText('Private wish lists')).not.toBeInTheDocument()
})

test('shows the animated loading shell while checking the account', () => {
  mockAuth.mockReturnValue({ member: null, loading: true } as ReturnType<typeof useAuth>)

  render(<ProtectedRoute>{child}</ProtectedRoute>)

  expect(screen.getByRole('status')).toHaveTextContent('Loading your account')
  expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
})

test('limits the admin page to admins', () => {
  mockAuth.mockReturnValue({
    member: { id: 'member-1', name: 'Alex', is_admin: false },
    loading: false,
  } as ReturnType<typeof useAuth>)
  render(<ProtectedRoute adminOnly>{child}</ProtectedRoute>)
  expect(screen.getByText(/Only an admin/)).toBeInTheDocument()
  expect(screen.queryByText('Private wish lists')).not.toBeInTheDocument()
})
