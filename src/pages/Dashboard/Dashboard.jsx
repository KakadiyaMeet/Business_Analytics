import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import './Dashboard.css'

function Dashboard() {
  const { activeDatasetId, setActiveDatasetId } = useDataset()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/dashboard/')
      .then(res => {
        setData(res.data)
        setLoading(false)
        if (res.data.latest_dataset && !activeDatasetId) {
          setActiveDatasetId(res.data.latest_dataset.id)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const kpis = data?.kpis || {}
  const latest = data?.latest_dataset
  const datasets = data?.datasets || []
  const hasData = data?.has_data

  const kpiCards = [
    { label: 'Total Rows', value: kpis.total_rows?.toLocaleString() || '—', icon: 'rows', accent: 'indigo' },
    { label: 'Total Columns', value: kpis.total_columns?.toString() || '—', icon: 'cols', accent: 'blue' },
    { label: 'Numeric Columns', value: kpis.numeric_columns?.toString() || '—', icon: 'num', accent: 'emerald' },
    { label: 'Categorical Columns', value: kpis.categorical_columns?.toString() || '—', icon: 'cat', accent: 'violet' },
    { label: 'Missing Values', value: kpis.missing_values?.toLocaleString() || '0', icon: 'miss', accent: 'amber' },
    { label: 'Duplicate Rows', value: kpis.duplicate_rows?.toLocaleString() || '0', icon: 'dup', accent: 'rose' },
  ]

  const quickActions = [
    { to: '/upload', label: 'Upload Data', desc: 'Import CSV files', accent: 'indigo', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
    { to: '/eda', label: 'Run EDA', desc: 'Explore your data', accent: 'blue', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { to: '/visualization', label: 'Visualize', desc: 'Create charts', accent: 'emerald', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> },
    { to: '/prediction', label: 'Predict', desc: 'ML predictions', accent: 'amber', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { to: '/reports', label: 'Reports', desc: 'Download PDFs', accent: 'rose', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  ]

  function getTimeAgo(dateStr) {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="dash-page">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">Welcome back — here's your data at a glance</p>
        </div>
        <div className="dash-header-actions">
          <div className="dash-date-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="state-message"><div className="spinner"></div><div>Loading dashboard…</div></div>
      ) : !hasData ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2 className="dash-empty-title">CSV File Not Uploaded</h2>
          <p className="dash-empty-desc">Please upload a CSV file to start exploring your data with powerful analytics.</p>
          <Link to="/upload" className="dash-empty-btn">Upload Dataset →</Link>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {kpiCards.map((kpi, i) => (
              <div key={kpi.label} className={`kpi-card accent-${kpi.accent}`} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="kpi-top">
                  <span className="kpi-label">{kpi.label}</span>
                  <div className={`kpi-icon-box ${kpi.accent}`}>
                    <KpiIcon type={kpi.icon} />
                  </div>
                </div>
                <div className="kpi-value">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="dash-main">
            {/* Latest Dataset Info */}
            {latest && (
              <div className="dash-card">
                <div className="dash-card-header">
                  <div>
                    <h2 className="dash-card-title">Latest Uploaded Dataset</h2>
                    <p className="dash-card-sub">{latest.original_filename}</p>
                  </div>
                  <span className="dash-badge">{getTimeAgo(latest.uploaded_at)}</span>
                </div>
                <div className="latest-stats">
                  <div className="latest-stat"><span className="latest-stat-label">Rows</span><span className="latest-stat-value">{latest.total_rows?.toLocaleString()}</span></div>
                  <div className="latest-stat"><span className="latest-stat-label">Columns</span><span className="latest-stat-value">{latest.total_columns}</span></div>
                  <div className="latest-stat"><span className="latest-stat-label">Numeric</span><span className="latest-stat-value">{latest.numeric_columns_count}</span></div>
                  <div className="latest-stat"><span className="latest-stat-label">Categorical</span><span className="latest-stat-value">{latest.categorical_columns_count}</span></div>
                  <div className="latest-stat"><span className="latest-stat-label">Missing</span><span className="latest-stat-value">{latest.missing_values_count?.toLocaleString()}</span></div>
                  <div className="latest-stat"><span className="latest-stat-label">Duplicates</span><span className="latest-stat-value">{latest.duplicate_rows_count?.toLocaleString()}</span></div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <h2 className="dash-card-title">Quick Actions</h2>
                  <p className="dash-card-sub">Jump to common workflows</p>
                </div>
              </div>
              <div className="quick-actions">
                {quickActions.map(qa => (
                  <Link key={qa.to} to={qa.to} className="qa-btn">
                    <div className={`qa-icon ${qa.accent}`}>{qa.icon}</div>
                    <span className="qa-label">{qa.label}</span>
                    <span className="qa-desc">{qa.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Dataset Summary Table */}
          {datasets.length > 0 && (
            <div className="dash-card" style={{ marginTop: 24 }}>
              <div className="dash-card-header">
                <div>
                  <h2 className="dash-card-title">Dataset Summary</h2>
                  <p className="dash-card-sub">All uploaded datasets</p>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Filename</th>
                      <th>Rows</th>
                      <th>Columns</th>
                      <th>Numeric</th>
                      <th>Categorical</th>
                      <th>Missing</th>
                      <th>Duplicates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds, i) => (
                      <tr key={ds.id} onClick={() => setActiveDatasetId(ds.id)} style={{ cursor: 'pointer' }}>
                        <td><span className="product-rank">{i + 1}</span></td>
                        <td><span className="product-name">{ds.original_filename}</span></td>
                        <td>{ds.total_rows?.toLocaleString()}</td>
                        <td>{ds.total_columns}</td>
                        <td>{ds.numeric_columns_count}</td>
                        <td>{ds.categorical_columns_count}</td>
                        <td>{ds.missing_values_count?.toLocaleString()}</td>
                        <td>{ds.duplicate_rows_count?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiIcon({ type }) {
  const icons = {
    rows: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>,
    cols: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>,
    num: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6 4 4 6-8"/></svg>,
    cat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
    miss: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    dup: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>,
  }
  return icons[type] || null
}

export default Dashboard
