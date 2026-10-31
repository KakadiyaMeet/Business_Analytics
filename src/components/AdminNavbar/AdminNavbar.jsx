import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import './AdminNavbar.css'

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/datasets',
    label: 'Datasets',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    to: '/admin/predictions',
    label: 'Predictions',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/admin/reports',
    label: 'Reports',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    to: '/admin/activity',
    label: 'Activity',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    to: '/admin/profile',
    label: 'Profile',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
];

function AdminNavbar({ user, onLogout, theme, toggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)

  const username = user?.username || 'Admin'
  const email = user?.email || ''
  const initials = username.charAt(0).toUpperCase()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-left">
        <div className="admin-navbar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="12" width="4" height="8" rx="1" fill="#6366f1" />
            <rect x="10" y="6" width="4" height="14" rx="1" fill="#818cf8" />
            <rect x="16" y="9" width="4" height="11" rx="1" fill="#a5b4fc" />
          </svg>
        </div>
        <span className="admin-navbar-brand">Nova Admin</span>
        <span className="admin-badge">Admin Panel</span>
      </div>

      <div className="admin-navbar-center">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} className="admin-nav-tab" end={item.to === '/admin/dashboard'}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="admin-navbar-right">
        <button
          ref={avatarRef}
          className={`profile-avatar-btn admin-avatar ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Admin menu"
        >
          <span className="avatar-initials">{initials}</span>
        </button>

        {menuOpen && (
          <div className="profile-dropdown admin-dropdown" ref={menuRef}>
            <div className="profile-user-section">
              <div className="profile-avatar-large">
                <span>{initials}</span>
              </div>
              <div className="profile-user-info">
                <span className="profile-username">{username}</span>
                <span className="profile-email">{email}</span>
              </div>
            </div>

            <div className="profile-divider"></div>

            <div className="profile-menu-section">
              <span className="profile-section-label">Settings</span>
              <div className="profile-menu-item theme-toggle-row">
                <div className="theme-toggle-label">
                  {theme === 'dark' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    </svg>
                  )}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <button
                  className={`theme-toggle-switch ${theme === 'light' ? 'on' : ''}`}
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>
            </div>

            <div className="profile-divider"></div>

            <div className="profile-menu-section">
              <button className="profile-menu-item logout-item" onClick={() => { setMenuOpen(false); onLogout?.() }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default AdminNavbar
