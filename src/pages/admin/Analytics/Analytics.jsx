import { useState, useEffect } from 'react'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getAdminAnalytics } from '../../../api/adminApi'
import './Analytics.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const chartFont = { family: "'Inter', sans-serif" }

function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminAnalytics()
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="state-message"><div className="spinner"></div><div>Loading analytics…</div></div>
  }

  if (!data) {
    return <div className="state-message">No analytics data available.</div>
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: chartFont, color: 'rgba(255,255,255,0.5)', padding: 16 } },
      tooltip: { bodyFont: chartFont, titleFont: chartFont, backgroundColor: 'rgba(10,10,18,0.9)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 },
    },
    scales: {
      x: { ticks: { font: chartFont, color: 'rgba(255,255,255,0.35)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { font: chartFont, color: 'rgba(255,255,255,0.35)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  }

  const regData = {
    labels: data.registrations_per_month.map(r => r.month),
    datasets: [{
      label: 'Registrations',
      data: data.registrations_per_month.map(r => r.count),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointBorderWidth: 0,
      pointRadius: 4,
    }],
  }

  const uploadData = {
    labels: data.uploads_per_month.map(u => u.month),
    datasets: [{
      label: 'Uploads',
      data: data.uploads_per_month.map(u => u.count),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 6,
      borderSkipped: false,
    }],
  }

  const modelColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']
  const modelData = {
    labels: data.model_usage.map(m => m.model),
    datasets: [{
      data: data.model_usage.map(m => m.count),
      backgroundColor: modelColors.slice(0, data.model_usage.length),
      borderWidth: 0,
    }],
  }

  const reportColors = ['#f59e0b', '#6366f1', '#10b981']
  const reportData = {
    labels: data.report_stats.map(r => r.type),
    datasets: [{
      data: data.report_stats.map(r => r.count),
      backgroundColor: reportColors.slice(0, data.report_stats.length),
      borderWidth: 0,
    }],
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: chartFont, color: 'rgba(255,255,255,0.5)', padding: 16, usePointStyle: true, pointStyleWidth: 12 } },
      tooltip: { bodyFont: chartFont, titleFont: chartFont, backgroundColor: 'rgba(10,10,18,0.9)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 },
    },
  }

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics</h1>
          <p className="an-subtitle">System-wide usage statistics and trends</p>
        </div>
      </div>

      <div className="an-charts-grid">
        <div className="an-chart-card">
          <h3 className="an-chart-title">User Registrations / Month</h3>
          <div className="an-chart-body">
            {data.registrations_per_month.length > 0 ? (
              <Line data={regData} options={baseOptions} />
            ) : (
              <p className="an-no-data">No registration data yet.</p>
            )}
          </div>
        </div>

        <div className="an-chart-card">
          <h3 className="an-chart-title">Dataset Uploads / Month</h3>
          <div className="an-chart-body">
            {data.uploads_per_month.length > 0 ? (
              <Bar data={uploadData} options={baseOptions} />
            ) : (
              <p className="an-no-data">No upload data yet.</p>
            )}
          </div>
        </div>

        <div className="an-chart-card">
          <h3 className="an-chart-title">Model Usage</h3>
          <div className="an-chart-body">
            {data.model_usage.length > 0 ? (
              <Doughnut data={modelData} options={pieOptions} />
            ) : (
              <p className="an-no-data">No prediction data yet.</p>
            )}
          </div>
        </div>

        <div className="an-chart-card">
          <h3 className="an-chart-title">Report Downloads by Type</h3>
          <div className="an-chart-body">
            {data.report_stats.length > 0 ? (
              <Pie data={reportData} options={pieOptions} />
            ) : (
              <p className="an-no-data">No report data yet.</p>
            )}
          </div>
        </div>
      </div>

      {data.active_users?.length > 0 && (
        <div className="an-chart-card" style={{ marginTop: 24 }}>
          <h3 className="an-chart-title">Most Active Users</h3>
          <div className="an-users-list">
            {data.active_users.map((u, i) => (
              <div key={u.username} className="an-user-row">
                <span className="an-user-rank">{i + 1}</span>
                <span className="an-user-name">{u.username}</span>
                <div className="an-user-bar-wrap">
                  <div
                    className="an-user-bar"
                    style={{ width: `${(u.count / data.active_users[0].count) * 100}%` }}
                  />
                </div>
                <span className="an-user-count">{u.count} actions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
