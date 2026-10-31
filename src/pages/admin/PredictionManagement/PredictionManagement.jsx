import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/DataTable/DataTable'
import ConfirmModal from '../../../components/ConfirmModal/ConfirmModal'
import { getAdminPredictions, deletePrediction } from '../../../api/adminApi'
import './PredictionManagement.css'

function PredictionManagement() {
  const [predictions, setPredictions] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, search: '', sort_by: '-created_at' })
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null })
  const [detailModal, setDetailModal] = useState({ open: false, item: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    getAdminPredictions(params)
      .then(res => { setPredictions(res.data.predictions); setPagination(res.data.pagination); setLoading(false) })
      .catch(error => {
        console.log(error)
        setLoading(false)
      })
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async () => {
    if (!deleteModal.item) return
    setActionLoading(true)
    try {
      await deletePrediction(deleteModal.item.id)
      setSuccessMsg('Prediction deleted.')
      setDeleteModal({ open: false, item: null })
      fetchData()
    } catch (error){
      console.log(error)
    }
    setActionLoading(false)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const columns = [
    { key: 'model_display', label: 'Model', render: (row) => <span className="pm-model">{row.model_display}</span> },
    { key: 'user_info', label: 'User', render: (row) => row.user_info?.username || '—' },
    { key: 'dataset_name', label: 'Dataset', render: (row) => row.dataset_name || '—' },
    { key: 'target_column', label: 'Target' },
    { key: 'r2_score', label: 'R²', sortable: true, render: (row) => row.r2_score?.toFixed(4) },
    { key: 'mae', label: 'MAE', sortable: true, render: (row) => row.mae?.toFixed(4) },
    { key: 'created_at', label: 'Date', sortable: true, render: (row) => new Date(row.created_at).toLocaleDateString() },
  ]

  return (
    <div className="pm-page">
      <div className="pm-header">
        <div>
          <h1 className="pm-title">Prediction Management</h1>
          <p className="pm-subtitle">View and manage all prediction runs</p>
        </div>
      </div>

      {successMsg && <div className="um-success">{successMsg}</div>}

      <DataTable
        columns={columns}
        data={predictions}
        pagination={pagination}
        onPageChange={(p) => setParams(s => ({ ...s, page: p }))}
        onSearch={(v) => setParams(s => ({ ...s, search: v, page: 1 }))}
        onSort={(k) => setParams(s => ({ ...s, sort_by: k }))}
        onDateFilter={({ date_from, date_to }) => setParams(s => ({ ...s, date_from, date_to, page: 1 }))}
        searchPlaceholder="Search predictions…"
        loading={loading}
        emptyText="No predictions found."
        showDateFilter
        sortBy={params.sort_by}
        actions={(row) => (
          <div className="um-actions">
            <button className="um-action-btn view" onClick={() => setDetailModal({ open: true, item: row })} title="View Details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button className="um-action-btn delete" onClick={() => setDeleteModal({ open: true, item: row })} title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      />

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Prediction"
        message="Are you sure you want to delete this prediction record?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, item: null })}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      {detailModal.open && detailModal.item && (
        <div className="confirm-overlay" onClick={() => setDetailModal({ open: false, item: null })}>
          <div className="confirm-modal pm-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-title">Prediction Details</h3>
            <div className="pm-detail-grid">
              <div className="pm-detail-item"><span className="pm-detail-label">Model</span><span>{detailModal.item.model_display}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">User</span><span>{detailModal.item.user_info?.username}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">Dataset</span><span>{detailModal.item.dataset_name}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">Target</span><span>{detailModal.item.target_column}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">R² Score</span><span>{detailModal.item.r2_score?.toFixed(6)}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">MAE</span><span>{detailModal.item.mae?.toFixed(6)}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">MSE</span><span>{detailModal.item.mse?.toFixed(6)}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">RMSE</span><span>{detailModal.item.rmse?.toFixed(6)}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">Split</span><span>{detailModal.item.split_pct}%</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">Missing Strategy</span><span>{detailModal.item.missing_value_strategy}</span></div>
              <div className="pm-detail-item"><span className="pm-detail-label">Date</span><span>{new Date(detailModal.item.created_at).toLocaleString()}</span></div>
            </div>
            <div className="confirm-actions" style={{ marginTop: 20 }}>
              <button className="confirm-btn cancel" onClick={() => setDetailModal({ open: false, item: null })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PredictionManagement
