import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import './Upload.css'

function Upload() {
  const { setActiveDatasetId } = useDataset()
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // Data from API
  const [datasetInfo, setDatasetInfo] = useState(null)
  const [previewRows, setPreviewRows] = useState([])
  const [previewColumns, setPreviewColumns] = useState([])
  const [fillInfo, setFillInfo] = useState({})

  /* Upload file to backend */
  const doUpload = async (f) => {
    setFile(f)
    setProgress(0)
    setUploaded(false)
    setUploading(true)
    setError('')
    setDatasetInfo(null)
    setPreviewRows([])
    setPreviewColumns([])
    setFillInfo({})

    const formData = new FormData()
    formData.append('file', f)

    try {
      const res = await axios.post('/api/upload/', formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        },
      })

      setProgress(100)
      setUploaded(true)
      setUploading(false)
      setDatasetInfo(res.data.dataset)
      setPreviewRows(res.data.preview || [])
      setPreviewColumns(res.data.columns || [])
      setFillInfo(res.data.fill_info || {})

      // Store dataset ID for other pages
      setActiveDatasetId(res.data.dataset.id)
    } catch (err) {
      setUploading(false)
      setProgress(0)
      const msg = err.response?.data?.error || 'Upload failed. Please try again.'
      setError(msg)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.toLowerCase().endsWith('.csv')) doUpload(f)
    else setError('Only .csv files are supported.')
  }

  const handleBrowse = () => fileRef.current?.click()

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) doUpload(f)
  }

  const handleCancel = () => {
    setFile(null)
    setProgress(0)
    setUploaded(false)
    setUploading(false)
    setError('')
    setDatasetInfo(null)
    setPreviewRows([])
    setPreviewColumns([])
    setFillInfo({})
  }

  /* Display values */
  const fileName = datasetInfo ? datasetInfo.original_filename : (file ? file.name : '—')
  const fileSize = datasetInfo
    ? `${(datasetInfo.file_size / (1024 * 1024)).toFixed(1)} MB`
    : (file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '—')
  const totalRows = datasetInfo ? datasetInfo.total_rows.toLocaleString() : '—'
  const totalCols = datasetInfo ? datasetInfo.total_columns : '—'

  const hasFills = Object.keys(fillInfo).length > 0

  return (
    <div className="upload-page">
      {/* ===== Header ===== */}
      <div className="upload-header">
        <div>
          <h1 className="upload-title">Upload Dataset</h1>
          <p className="upload-subtitle">Securely upload your CSV files for analysis and ML predictions.</p>
        </div>
        <Link to="/eda" className="goto-eda-btn">
          → Go to EDA
        </Link>
      </div>

      {/* ===== Main Layout ===== */}
      <div className="upload-layout">
        {/* Left Column */}
        <div>
          {/* Dropzone Card */}
          <div className="upload-card" style={{ marginBottom: 28 }}>
            <div
              className={`dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={handleBrowse}
            >
              <div className="dropzone-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <polyline points="16 11 12 7 8 11" />
                  <line x1="12" y1="7" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="dropzone-title">Drag & Drop CSV File</h3>
              <p className="dropzone-hint">Maximum file size 50MB. Only .csv format supported.</p>
              <div className="dropzone-divider">
                <span>or</span>
              </div>
              <button className="browse-btn" onClick={(e) => { e.stopPropagation(); handleBrowse() }}>
                Browse Computer
              </button>
            </div>
            <input
              type="file"
              accept=".csv"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="upload-card error-card" style={{ marginBottom: 28 }}>
              <p className="error-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Data Preview */}
          {previewRows.length > 0 && (
            <div className="upload-card">
              <div className="preview-header">
                <h2 className="preview-title">Data Preview</h2>
                <span className="preview-badge">{fileName.toUpperCase()}</span>
              </div>
              <div className="preview-table-scroll-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>ROW ID</th>
                      {previewColumns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        {previewColumns.map((col) => (
                          <td key={col} style={row[col] === null ? { color: '#f87171', fontStyle: 'italic' } : {}}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'null'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="upload-sidebar">
          {/* Upload Status */}
          <div className="upload-card">
            <h3 className="status-card-title">Upload Status</h3>

            <div className="status-progress">
              <div className="status-progress-header">
                <span className={`status-progress-label ${uploading ? 'uploading-label' : ''}`}>
                  {uploading ? 'Uploading…' : (uploaded ? 'Complete' : 'Waiting…')}
                </span>
                <span className="status-progress-pct">{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <div className="file-info">
              <div className="file-info-row">
                <span className="file-info-label">File Name</span>
                <span className="file-info-value">{fileName}</span>
              </div>
              <div className="file-info-row">
                <span className="file-info-label">File Size</span>
                <span className="file-info-value">{fileSize}</span>
              </div>
              <div className="file-info-row">
                <span className="file-info-label">Total Rows</span>
                <span className="file-info-value highlight">{totalRows}</span>
              </div>
              {totalCols !== '—' && (
                <div className="file-info-row">
                  <span className="file-info-label">Columns</span>
                  <span className="file-info-value">{totalCols}</span>
                </div>
              )}
            </div>

            {uploaded && (
              <div className="validation-badge">
                <svg className="validation-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="validation-text">Data validation passed</span>
              </div>
            )}

            {/* Null Fill Info */}
            {hasFills && (
              <div className="validation-badge" style={{ borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.04)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                  Null values filled with mean in {Object.keys(fillInfo).length} column(s)
                </span>
              </div>
            )}

            <div className="status-actions">
              <button className="status-cancel-btn" onClick={handleCancel}>Cancel</button>
              <Link to="/eda" className="status-confirm-btn" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Confirm
              </Link>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}

export default Upload