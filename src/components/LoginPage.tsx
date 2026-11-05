import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff } from 'lucide-react'
import styles from '../styles/LoginPage.module.css'

const signupErrorMessage = (error: unknown) => {
  if (error instanceof Error && (
    ('code' in error && error.code === 'over_email_send_rate_limit') ||
    /email rate limit exceeded/i.test(error.message)
  )) {
    return 'Confirmation emails are temporarily unavailable. Please try again in about an hour or ask the site owner to enable more email capacity.'
  }
  return error instanceof Error ? error.message : 'Could not create account'
}

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const result = await signup(name.trim(), email.trim(), password)
        if (result.needsEmailConfirmation) {
          setSuccess('Check your email and open the confirmation link. It will sign you in automatically in the browser that opens it.')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        await login(email.trim(), password)
      }
    }
    catch (err) { setError(mode === 'signup' ? signupErrorMessage(err) : err instanceof Error ? err.message : 'Could not sign in') }
    finally { setSubmitting(false) }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  return <div className={styles.container}>
    <div className={styles.content}>
      <div className={styles.header}>
        <div className={styles.iconContainer}><Lock className={styles.icon} /></div>
        <h1 className={styles.title}>{mode === 'signup' ? 'Create account' : 'Sign in'}</h1>
        <p className={styles.subtitle}>{mode === 'signup' ? 'Make an account to start sharing wish lists.' : 'Sign in to view and manage wish lists.'}</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === 'signup' && <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>Name</label>
          <input id="name" type="text" autoComplete="name" required maxLength={80} className={styles.input}
            value={name} onChange={e => setName(e.target.value)} />
        </div>}
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input id="email" type="email" autoComplete="email" required className={styles.input}
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <div className={styles.inputContainer}>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required minLength={mode === 'signup' ? 6 : undefined} className={styles.input} value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
              className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className={styles.passwordToggleIcon} /> : <Eye className={styles.passwordToggleIcon} />}
            </button>
          </div>
        </div>
        {mode === 'signup' && <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
          <input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
            required minLength={6} className={styles.input} value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} />
        </div>}
        {error && <div role="alert" className={styles.error}>{error}</div>}
        {success && <div role="status" className={styles.success}>{success}</div>}
        <div className={styles.buttonContainer}>
          <button type="submit" disabled={submitting} className={styles.submitButton}>
            {submitting ? (mode === 'signup' ? 'Creating account...' : 'Signing in...') : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>
        </div>
      </form>
      <p className={styles.modePrompt}>
        {mode === 'signup' ? 'Already have an account?' : 'New to Wish Lists?'}{' '}
        <button type="button" onClick={switchMode} className={styles.modeButton}>
          {mode === 'signup' ? 'Sign in' : 'Create account'}
        </button>
      </p>
    </div>
  </div>
}

export default LoginPage
