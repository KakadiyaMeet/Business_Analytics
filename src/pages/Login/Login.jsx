import { useState } from 'react'
import axios from '../../api/axios'
import './Login.css'

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const validate = () => {
    const newErrors = {}
    if (isRegister && !email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (isRegister && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!username.trim()) {
      newErrors.username = 'Username is required'
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    setServerError('')

    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      const endpoint = isRegister ? '/api/auth/register/' : '/api/auth/login/'
      const payload = isRegister
        ? { username, email, password }
        : { username, password }

      const res = await axios.post(endpoint, payload)
      const userData = res.data.user
      if (onLogin) onLogin(userData)
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed. Please try again.'
      setServerError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="12" width="4" height="8" rx="1" fill="#6366f1" />
              <rect x="10" y="6" width="4" height="14" rx="1" fill="#818cf8" />
              <rect x="16" y="9" width="4" height="11" rx="1" fill="#a5b4fc" />
            </svg>
          </div>
        </div>

        <h1 className="login-title">Nova Analytics</h1>
        <p className="login-subtitle">
          {isRegister ? 'Create your account' : 'Business intelligence for the future'}
        </p>

        {serverError && (
          <div className="server-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4L12 13 2 4" />
                </svg>
                <input
                  id="login-email" type="email" placeholder="name@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })) }}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          )}

          <div className={`form-group ${errors.username ? 'has-error' : ''}`}>
            <label htmlFor="login-username">Username</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <input
                id="login-username" type="text" placeholder="Enter your username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: '' })) }}
              />
            </div>
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-password" type="password" placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })) }}
              />
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="login-btn" id="login-submit" disabled={loading}>
            <span>{loading ? 'Please wait…' : (isRegister ? 'Create Account' : 'Sign In')}</span>
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>

        <p className="login-footer">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setErrors({}); setServerError('') }}>
            {isRegister ? 'Sign in' : 'Create account'}
          </a>
        </p>
      </div>
    </div>
  )
}

export default Login
