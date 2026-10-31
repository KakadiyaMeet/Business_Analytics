import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar({ theme, toggleTheme, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)

  const username = user?.username || 'User'
  const email = user?.email || ''
  const initials = username.charAt(0).toUpperCase()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        avatarRef.current && !avatarRef.current.contains(e.target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    if (onLogout) onLogout()
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="12" width="4" height="8" rx="1" fill="#6366f1" />
            <rect x="10" y="6" width="4" height="14" rx="1" fill="#818cf8" />
            <rect x="16" y="9" width="4" height="11" rx="1" fill="#a5b4fc" />
          </svg>
        </div>
        <span className="navbar-brand">Nova Analytics</span>
      </div>

      <div className="navbar-center">
        <NavLink to="/dashboard" className="nav-tab">Dashboard</NavLink>
        <NavLink to="/upload" className="nav-tab">Upload</NavLink>
        <NavLink to="/eda" className="nav-tab">EDA</NavLink>
        <NavLink to="/visualization" className="nav-tab">Visualizations</NavLink>
        <NavLink to="/prediction" className="nav-tab">Prediction</NavLink>
        <NavLink to="/reports" className="nav-tab">Reports</NavLink>
        <NavLink to="/model-comparison" className="nav-tab">Hello</NavLink>
      </div>

      <div className="navbar-right">
        <button
          ref={avatarRef}
          className={`profile-avatar-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Profile menu"
          id="profile-avatar-btn"
        >
          <span className="avatar-initials">{initials}</span>
        </button>

        {menuOpen && (
          <div className="profile-dropdown" ref={menuRef}>
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
                  id="theme-toggle-btn"
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>
            </div>

            <div className="profile-divider"></div>

            <div className="profile-menu-section">
              <button className="profile-menu-item logout-item" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
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

export default Navbar
