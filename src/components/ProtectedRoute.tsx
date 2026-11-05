import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from './LoginPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { member, loading } = useAuth()
  if (loading) return <div role="status">Loading account...</div>
  if (!member) return <LoginPage />
  if (adminOnly && !member.is_admin) return <div role="alert">Only an admin can open this page.</div>
  return <>{children}</>
}

export default ProtectedRoute
