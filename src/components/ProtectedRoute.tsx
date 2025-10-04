import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoginPage from './LoginPage'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <>{children}</>
}

export default ProtectedRoute
