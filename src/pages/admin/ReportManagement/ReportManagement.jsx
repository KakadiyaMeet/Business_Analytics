import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/DataTable/DataTable'
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal'
import { getAdminReports, downloadReport, deleteReport } from '../../../api/adminApi'
import './ReportManagement.css'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function ReportManagement() {
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, search: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    getAdminReports(params)
      .then(res => { setReports(res.data.reports); setPagination(res.data.pagination); setLoading(false) })
      .catch(error => { 
        console.log(error)
        setLoading(false)
      })
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDownload = async (id) => {
    try {
      const res = await downloadReport(id)
      window.open(res.data.download_url, '_blank')
    } catch(error){
      console.log(error)
    } 
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    setActionLoading(true)
    try {
      await deleteReport(deleteModal.item.id)
      setSuccessMsg('Report deleted.')
      setDeleteModal({ open: false, item: null })
      fetchData()
    } catch(error){
      console.log(error)
    } 
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const columns = [
    { key: 'report_type_display', label: 'Type', render: (row) => <span className="rm-type">{row.report_type_display}</span> },
    { key: 'user_info', label: 'User', render: (row) => row.user_info?.username || '—' },
    { key: 'dataset_name', label: 'Dataset', render: (row) => row.dataset_name || '—' },
    { key: 'file_size', label: 'Size', render: (row) => formatBytes(row.file_size) },
    { key: 'download_count', label: 'Downloads' },
    { key: 'created_at', label: 'Created', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ]

  return (
    <div className="rm-page">
      <div className="rm-header">
        <div>
          <h1 className="rm-title">Report Management</h1>
          <p className="rm-subtitle">View and manage all generated reports</p>
        </div>
      </div>

      {successMsg && <div className="um-success">{successMsg}</div>}

      <DataTable
        columns={columns}
        data={reports}
        pagination={pagination}
        onPageChange={(p) => setParams(s => ({ ...s, page: p }))}
        onSearch={(v) => setParams(s => ({ ...s, search: v, page: 1 }))}
        onDateFilter={({ date_from, date_to }) => setParams(s => ({ ...s, date_from, date_to, page: 1 }))}
        searchPlaceholder="Search reports…"
        loading={loading}
        emptyText="No reports found."
        showDateFilter
        actions={(row) => (
          <div className="um-actions">
            <button className="um-action-btn view" onClick={() => handleDownload(row.id)} title="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </button>
            <button className="um-action-btn delete" onClick={() => setDeleteModal({ open: true, item: row })} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      />

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Report"
        message="Are you sure you want to delete this report? The file will be removed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
        loading={actionLoading}
      />
    </div>
  )
}

export default ReportManagement
