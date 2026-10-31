import { useState, useEffect } from 'react'
import { getAdminDashboard } from '../../../api/adminApi'
import './AdminDashboard.css'

function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboard()
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cards = data ? [
    { label: 'Total Users', value: data.total_users, icon: 'users', accent: 'indigo' },
    { label: 'Active Users', value: data.active_users, icon: 'active', accent: 'emerald' },
    { label: 'Total Datasets', value: data.total_datasets, icon: 'datasets', accent: 'blue' },
    { label: 'Total Predictions', value: data.total_predictions, icon: 'predictions', accent: 'amber' },
    { label: 'Total Reports', value: data.total_reports, icon: 'reports', accent: 'violet' },
    { label: 'Total Storage', value: formatBytes(data.total_storage), icon: 'storage', accent: 'cyan' },
    { label: 'Total CSVs', value: data.total_csv_files, icon: 'csvs', accent: 'rose' },
  ] : []

  return (
    <div className="admin-dash-page">
      <div className="admin-dash-header">
        <div>
          <h1 className="admin-dash-title">Admin Dashboard</h1>
          <p className="admin-dash-subtitle">System overview at a glance</p>
        </div>
        <div className="admin-dash-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="state-message"><div className="spinner"></div><div>Loading dashboard…</div></div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            {cards.map((card, i) => (
              <div key={card.label} className={`admin-kpi-card accent-${card.accent}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="admin-kpi-top">
                  <span className="admin-kpi-label">{card.label}</span>
                  <div className={`admin-kpi-icon ${card.accent}`}>
                    <AdminIcon type={card.icon} />
                  </div>
                </div>
                <div className="admin-kpi-value">
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </div>
              </div>
              ))}
          </div>

          {data?.latest_activity && (
            <div className="admin-latest-activity">
              <h2 className="admin-section-title">Latest Activity</h2>
              <div className="activity-card">
                <div className="activity-info">
                  <span className="activity-user">{data.latest_activity.username}</span>
                  <span className="activity-action">{data.latest_activity.action_display}</span>
                </div>
                <div className="activity-meta">
                  {data.latest_activity.ip_address && (
                    <span className="activity-ip">{data.latest_activity.ip_address}</span>
                  )}
                  <span className="activity-time">
                    {new Date(data.latest_activity.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function AdminIcon({ type }) {
  const icons = {
    users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    active: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    datasets: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
    predictions: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6 4 4 6-8" /></svg>,
    reports: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    storage: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
    csvs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>,
  }
  return icons[type] || null
}

export default AdminDashboard
