import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from './LoginPage'
import { useAuth } from '../contexts/AuthContext'

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }))

test('a visitor can create an account and sees the email confirmation step', async () => {
  const signup = jest.fn().mockResolvedValue({ needsEmailConfirmation: true })
  ;(useAuth as jest.Mock).mockReturnValue({ login: jest.fn(), signup })

  render(<LoginPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  expect(screen.getByLabelText('Name')).toBeInTheDocument()
  expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Example-Test-Password-8' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Example-Test-Password-8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

  await waitFor(() => expect(signup).toHaveBeenCalledWith('Alex', 'alex@example.com', 'Example-Test-Password-8'))
  expect(await screen.findByRole('status')).toHaveTextContent('It will sign you in automatically')
})

test('sign-up rejects mismatched passwords before contacting Supabase', () => {
  const signup = jest.fn()
  ;(useAuth as jest.Mock).mockReturnValue({ login: jest.fn(), signup })

  render(<LoginPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Example-Test-Password-8' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
  expect(signup).not.toHaveBeenCalled()
})

test('sign-up explains the confirmation email limit', async () => {
  const signup = jest.fn().mockRejectedValue(Object.assign(new Error('email rate limit exceeded'), {
    code: 'over_email_send_rate_limit',
  }))
  ;(useAuth as jest.Mock).mockReturnValue({ login: jest.fn(), signup })

  render(<LoginPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alex' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Example-Test-Password-8' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Example-Test-Password-8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Confirmation emails are temporarily unavailable')
})
