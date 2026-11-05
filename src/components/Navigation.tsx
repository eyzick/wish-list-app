import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Home, Settings, LogOut, Gift } from 'lucide-react'
import styles from '../styles/Navigation.module.css'

const Navigation: React.FC = () => {
  const { member, logout } = useAuth()
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
            <div className={styles.navLinks}>
            {member && <Link
              to="/"
              aria-label="Home"
              className={`${styles.navLink} ${location.pathname === '/' ? styles.navLinkActive : styles.navLinkInactive}`}
            >
              <Home className={styles.navLinkIcon} />
              <span>Home</span>
            </Link>}
            
            {member?.is_admin && <Link
              to="/admin"
              aria-label="Admin"
              className={`${styles.navLink} ${location.pathname === '/admin' ? styles.navLinkActive : styles.navLinkInactive}`}
            >
              <Settings className={styles.navLinkIcon} />
              <span>Admin</span>
            </Link>}
            </div>
            {member && (
              <div className={styles.account}>
              <span className={styles.memberAvatar} aria-hidden="true">{member.name.charAt(0).toUpperCase()}</span>
              <span className={styles.memberName}>{member.name}</span>
              <button
                onClick={() => { void logout() }}
                className={styles.logoutButton}
                aria-label="Log out"
              >
                <LogOut className={styles.logoutButtonIcon} />
                <span>Log out</span>
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
