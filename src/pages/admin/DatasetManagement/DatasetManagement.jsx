import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/DataTable/DataTable'
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal'
import { getAdminDatasets, downloadDataset, deleteDataset } from '../../../api/adminApi'
import './DatasetManagement.css'

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function DatasetManagement() {
  const [datasets, setDatasets] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, search: '', sort_by: '-uploaded_at' })
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    getAdminDatasets(params)
      .then(res => { setDatasets(res.data.datasets); setPagination(res.data.pagination); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDownload = async (id) => {
    try {
      const res = await downloadDataset(id)
      window.open(res.data.download_url, '_blank')
    } catch(error){
      console.log(error)
    } 
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return
    setActionLoading(true)
    try {
      await deleteDataset(deleteModal.item.id)
      setSuccessMsg(`Dataset "${deleteModal.item.original_filename}" deleted.`)
      setDeleteModal({ open: false, item: null })
      fetchData()
    } catch(error){
      console.log(error)
    } 
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const columns = [
    { key: 'original_filename', label: 'Filename', sortable: true, render: (row) => <span className="dm-filename">{row.original_filename}</span> },
    { key: 'uploaded_by', label: 'Uploaded By', render: (row) => row.uploaded_by?.username || '—' },
    { key: 'total_rows', label: 'Rows', sortable: true, render: (row) => row.total_rows?.toLocaleString() },
    { key: 'total_columns', label: 'Columns' },
    { key: 'file_size', label: 'Size', sortable: true, render: (row) => formatBytes(row.file_size) },
    { key: 'missing_values_count', label: 'Missing', render: (row) => row.missing_values_count?.toLocaleString() || '0' },
    { key: 'uploaded_at', label: 'Uploaded', sortable: true, render: (row) => new Date(row.uploaded_at).toLocaleDateString() },
  ]

  return (
    <div className="dm-page">
      <div className="dm-header">
        <div>
          <h1 className="dm-title">Dataset Management</h1>
          <p className="dm-subtitle">View and manage all uploaded datasets</p>
        </div>
      </div>

      {successMsg && <div className="um-success">{successMsg}</div>}

      <DataTable
        columns={columns}
        data={datasets}
        pagination={pagination}
        onPageChange={(p) => setParams(s => ({ ...s, page: p }))}
        onSearch={(v) => setParams(s => ({ ...s, search: v, page: 1 }))}
        onSort={(k) => setParams(s => ({ ...s, sort_by: k }))}
        onDateFilter={({ date_from, date_to }) => setParams(s => ({ ...s, date_from, date_to, page: 1 }))}
        searchPlaceholder="Search datasets…"
        loading={loading}
        emptyText="No datasets found."
        showDateFilter
        sortBy={params.sort_by}
        actions={(row) => (
          <div className="um-actions">
            <button className="um-action-btn view" onClick={() => handleDownload(row.id)} title="Download CSV">
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
        title="Delete Dataset"
        message={`Are you sure you want to delete "${deleteModal.item?.original_filename}"? The file and all related data will be removed.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
        loading={actionLoading}
      />
    </div>
  )
}

export default DatasetManagement
