import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/DataTable/DataTable'
import { getAdminActivityLogs } from '../../../api/adminApi'
import './ActivityLog.css'

function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, search: '' })

  const fetchData = useCallback(() => {
    setLoading(true)
    getAdminActivityLogs(params)
      .then(res => { setLogs(res.data.logs); setPagination(res.data.pagination); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = [
    { key: 'username', label: 'User', render: (row) => <span className="al-user">{row.username}</span> },
    {
      key: 'action_display', label: 'Action', render: (row) => (
        <span className={`al-action-badge ${row.action}`}>{row.action_display}</span>
      )
    },
    { key: 'ip_address', label: 'IP Address', render: (row) => row.ip_address || '—' },
    {
      key: 'details', label: 'Details', render: (row) => {
        if (!row.details || Object.keys(row.details).length === 0) return '—'
        return <span className="al-details" title={JSON.stringify(row.details)}>{JSON.stringify(row.details).slice(0, 60)}</span>
      }
    },
    {
      key: 'created_at', label: 'Date/Time', render: (row) => (
        <span className="al-time">{new Date(row.created_at).toLocaleString()}</span>
      )
    },
  ]

  return (
    <div className="al-page">
      <div className="al-header">
        <div>
          <h1 className="al-title">Activity Log</h1>
          <p className="al-subtitle">Track all user actions across the system</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        pagination={pagination}
        onPageChange={(p) => setParams(s => ({ ...s, page: p }))}
        onSearch={(v) => setParams(s => ({ ...s, search: v, page: 1 }))}
        onDateFilter={({ date_from, date_to }) => setParams(s => ({ ...s, date_from, date_to, page: 1 }))}
        searchPlaceholder="Search by user or action…"
        loading={loading}
        emptyText="No activity logs found."
        showDateFilter
      />
    </div>
  )
}

export default ActivityLog
