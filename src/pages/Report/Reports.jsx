import { useState, useEffect } from 'react'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import './Reports.css'

function Reports() {
  const { activeDatasetId } = useDataset()
  const [noDataset, setNoDataset] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [reports, setReports] = useState([])
  const [datasetName, setDatasetName] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Per-button loading states
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [generatingEda, setGeneratingEda] = useState(false)
  const [generatingPrediction, setGeneratingPrediction] = useState(false)

  const reportTypes = [
    {
      key: 'summary',
      label: 'Dataset Summary Report',
      desc: 'Overview of all columns, data types, statistics, and metadata from your uploaded CSV dataset.',
      accent: 'amber',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      key: 'eda',
      label: 'EDA Report',
      desc: 'Exploratory Data Analysis including missing values, duplicates, correlations, outliers, and distribution charts.',
      accent: 'indigo',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      key: 'prediction',
      label: 'Prediction Report',
      desc: 'Machine learning prediction results with evaluation metrics, visualizations, and prediction samples.',
      accent: 'emerald',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ]

  useEffect(() => {
    const dsId = activeDatasetId
    if (!dsId) {
      setNoDataset(true)
      setInitialLoading(false)
      return
    }

    Promise.all([
      axios.get(`/api/datasets/${dsId}/preview/?rows=1`),
      axios.get(`/api/datasets/${dsId}/reports/`),
    ])
      .then(([previewRes, reportsRes]) => {
        setDatasetName(previewRes.data.dataset?.original_filename || 'Dataset')
        setReports(reportsRes.data || [])
        setInitialLoading(false)
      })
      .catch(() => {
        setInitialLoading(false)
      })
  }, [])

  const setGenerating = (type, val) => {
    if (type === 'summary') setGeneratingSummary(val)
    else if (type === 'eda') setGeneratingEda(val)
    else if (type === 'prediction') setGeneratingPrediction(val)
  }

  const isGenerating = (type) => {
    if (type === 'summary') return generatingSummary
    if (type === 'eda') return generatingEda
    if (type === 'prediction') return generatingPrediction
    return false
  }

  const handleDownload = async (reportType) => {
    const dsId = activeDatasetId
    if (!dsId || isGenerating(reportType)) return

    setGenerating(reportType, true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const res = await axios.post(`/api/datasets/${dsId}/report/`, {
        report_type: reportType,
      })

      const newReport = res.data.report
      setReports(prev => [newReport, ...prev])

      // Download the file
      const downloadUrl = res.data.download_url
      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = ''
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      const typeName = reportTypes.find(t => t.key === reportType)?.label || reportType
      setSuccessMsg(`${typeName} downloaded successfully!`)
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err) {
      const backendError = err.response?.data?.error || 'Failed to generate report.'
      setErrorMsg(backendError)
      setTimeout(() => setErrorMsg(''), 8000)
    } finally {
      setGenerating(reportType, false)
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getReportFilename(report) {
    const url = report.file || ''
    const parts = url.split('/')
    return parts[parts.length - 1] || 'report'
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Reports</h1>
          <p className="reports-subtitle">Generate and download comprehensive PDF reports for your datasets</p>
        </div>
      </div>

      {initialLoading ? (
        <div className="state-message"><div className="spinner"></div><div>Loading reports…</div></div>
      ) : noDataset ? (
        <EmptyState
          skills={['Dataset Summary', 'EDA Report', 'Prediction Report']}
        />
      ) : (
        <>
          {/* Success Message */}
          {successMsg && (
            <div className="report-toast report-toast-success">
              <div className="report-toast-icon success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="report-toast-text">
                <strong>{successMsg}</strong>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="report-toast report-toast-error">
              <div className="report-toast-icon error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div className="report-toast-text">
                <strong>Report generation failed:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* Dataset Info Bar */}
          <div className="reports-dataset-bar">
            <div className="reports-dataset-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Dataset: <strong>{datasetName}</strong></span>
            </div>
          </div>

          {/* Three Download Cards */}
          <div className="report-download-grid">
            {reportTypes.map((rt, idx) => (
              <div key={rt.key} className={`report-download-card accent-${rt.accent}`} style={{ animationDelay: `${idx * 70}ms` }}>
                <div className={`rdc-icon-box ${rt.accent}`}>{rt.icon}</div>
                <h3 className="rdc-title">{rt.label}</h3>
                <p className="rdc-desc">{rt.desc}</p>
                <button
                  className={`rdc-download-btn ${rt.accent}`}
                  onClick={() => handleDownload(rt.key)}
                  disabled={isGenerating(rt.key)}
                >
                  {isGenerating(rt.key) ? (
                    <>
                      <div className="rdc-spinner"></div>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Report
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Reports History */}
          <div className="reports-card">
            <div className="reports-card-header">
              <div>
                <h2 className="reports-card-title">Generated Reports</h2>
                <p className="reports-card-sub">Previously generated reports for this dataset</p>
              </div>
              {reports.length > 0 && (
                <span className="reports-count">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="reports-empty">
                <div className="reports-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <p className="reports-empty-text">No reports generated yet. Click any download button above to generate your first report.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>File</th>
                      <th>Generated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r, i) => (
                      <tr key={r.id}>
                        <td><span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</span></td>
                        <td>
                          <span className={`report-type-badge ${r.report_type}`}>
                            {r.report_type === 'eda' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            )}
                            {r.report_type === 'prediction' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            )}
                            {r.report_type === 'summary' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            )}
                            {r.report_type_display || r.report_type}
                          </span>
                        </td>
                        <td><span className="report-filename">{getReportFilename(r)}</span></td>
                        <td><span className="report-date">{formatDate(r.created_at)}</span></td>
                        <td>
                          <a
                            href={r.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="report-download-btn"
                            download
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
