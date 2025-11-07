import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff } from 'lucide-react'
import styles from '../styles/LoginPage.module.css'

const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (login(password)) {
      // Redirect will be handled by the router
    } else {
      setError('Invalid password')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <Lock className={styles.icon} />
          </div>
          <h2 className={styles.title}>Admin Login</h2>
          <p className={styles.subtitle}>
            Enter your password to access the admin panel
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputContainer}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className={styles.input}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className={styles.passwordToggleIcon} />
                ) : (
                  <Eye className={styles.passwordToggleIcon} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.submitButton}
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
