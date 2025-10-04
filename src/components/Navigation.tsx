import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, Settings, LogOut, Gift } from 'lucide-react'
import styles from '../styles/Navigation.module.css'

const Navigation: React.FC = () => {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  return (
    <nav className={styles.nav}>
      <div className={styles.content}>
        <div className={styles.container}>
          <div className={styles.left}>
            <Link to="/" className={styles.logo}>
              <Gift className={styles.logoIcon} />
              <span className={styles.logoText}>Wish Lists</span>
            </Link>
          </div>
          
          <div className={styles.right}>
            <Link
              to="/"
              className={`${styles.navLink} ${location.pathname === '/' ? styles.navLinkActive : styles.navLinkInactive}`}
            >
              <Home className={styles.navLinkIcon} />
              Home
            </Link>
            
            <Link
              to="/admin"
              className={`${styles.navLink} ${location.pathname === '/admin' ? styles.navLinkActive : styles.navLinkInactive}`}
            >
              <Settings className={styles.navLinkIcon} />
              Admin
            </Link>
            
            {isAuthenticated && (
              <button
                onClick={logout}
                className={styles.logoutButton}
              >
                <LogOut className={styles.logoutButtonIcon} />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
