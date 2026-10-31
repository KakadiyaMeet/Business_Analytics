import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import axios from './api/axios'
import { DatasetProvider } from './context/DatasetContext'
import Navbar from './components/Navbar/Navbar'
import AdminNavbar from './components/AdminNavbar/AdminNavbar'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import Upload from './pages/Upload/Upload'
import EDA from './pages/EDA/EDA'
import Visualization from './pages/Visualization/Visualization'
import Prediction from './pages/Prediction/Prediction'
import Reports from './pages/Report/Reports'
import ModelComparison from './pages/ModelComparison/ModelComparison'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard/AdminDashboard'
import UserManagement from './pages/admin/UserManagement/UserManagement'
import DatasetManagement from './pages/admin/DatasetManagement/DatasetManagement'
import PredictionManagement from './pages/admin/PredictionManagement/PredictionManagement'
import ReportManagement from './pages/admin/ReportManagement/ReportManagement'
import ActivityLog from './pages/admin/ActivityLog/ActivityLog'
import AdminProfile from './pages/admin/AdminProfile/AdminProfile'

import './styles/App.css'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginPage = location.pathname === '/' || location.pathname === '/login'
  const isAdminPage = location.pathname.startsWith('/admin')

  // Auth state
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Theme management with localStorage persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Check authentication on mount — use API instead of localStorage
  useEffect(() => {
    axios.get('/api/auth/user/')
      .then(res => {
        if (res.data.user) {
          setUser(res.data.user)
        }
        setAuthChecked(true)
      })
      .catch(() => {
        setAuthChecked(true)
      })
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authChecked && !user && !isLoginPage) {
      navigate('/')
    }
  }, [authChecked, user, isLoginPage, navigate])

  // Redirect non-admin users away from /admin/*
  useEffect(() => {
    if (authChecked && user && isAdminPage && user.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [authChecked, user, isAdminPage, navigate])

  const handleLogin = (userData) => {
    setUser(userData)
    // Role-based redirect after state update
    setTimeout(() => {
      if (userData.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    }, 10)
  }

  const handleLogout = () => {
    axios.post('/api/auth/logout/').catch(() => {})
    setUser(null)
    navigate('/')
  }

  if (!authChecked) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (isLoginPage) {
    return <Login onLogin={handleLogin} />
  }

  // Admin layout
  if (isAdminPage) {
    if (!user || user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />
    }

    return (
      <DatasetProvider>
        <div className={`app ${theme}`}>
          <AdminNavbar user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
          <main className="main-content">
            <Routes>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/datasets" element={<DatasetManagement />} />
              <Route path="/admin/predictions" element={<PredictionManagement />} />
              <Route path="/admin/reports" element={<ReportManagement />} />
              <Route path="/admin/activity" element={<ActivityLog />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </DatasetProvider>
    )
  }

  // User layout
  return (
    <DatasetProvider>
      <div className={`app ${theme}`}>
        <Navbar theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/eda" element={<EDA />} />
            <Route path="/visualization" element={<Visualization />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/model-comparison" element={<ModelComparison />} />
          </Routes>
        </main>
      </div>
    </DatasetProvider>
  )
}

export default App
