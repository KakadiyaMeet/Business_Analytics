
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import './EDA.css'

function corrColor(val) {
  if (val >= 0.7) return 'rgba(34, 197, 94, 0.7)'
  if (val >= 0.4) return 'rgba(34, 197, 94, 0.4)'
  if (val >= 0.1) return 'rgba(34, 197, 94, 0.18)'
  if (val >= -0.1) return 'rgba(255, 255, 255, 0.04)'
  if (val >= -0.4) return 'rgba(239, 68, 68, 0.18)'
  return 'rgba(239, 68, 68, 0.4)'
}

function EDA() {
  const { activeDatasetId, setActiveDatasetId } = useDataset()
  const [loading, setLoading] = useState(true)
  const [noDataset, setNoDataset] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedCol, setSelectedCol] = useState('')
  const [datasetName, setDatasetName] = useState('')

  useEffect(() => {
    let dsId = activeDatasetId

    const loadEda = (id) => {
      Promise.all([
        axios.get(`/api/datasets/${id}/eda/`),
        axios.get(`/api/datasets/${id}/preview/?rows=1`),
      ]).then(([edaRes, prevRes]) => {
        setData(edaRes.data)
        if (edaRes.data.numeric_columns?.length > 0) setSelectedCol(edaRes.data.numeric_columns[0])
        setDatasetName(prevRes.data.dataset?.original_filename || '')
        setLoading(false)
      }).catch((err) => {
        const msg = err.response?.data?.error || 'Failed to load EDA analysis. The dataset file may be missing — please try re-uploading.'
        setError(msg)
        setLoading(false)
      })
    }

    if (dsId) {
      loadEda(dsId)
    } else {
      // No dataset pre-selected — fetch user's datasets and pick the latest
      axios.get('/api/datasets/')
        .then(res => {
          const datasets = res.data
          if (datasets && datasets.length > 0) {
            const latestId = datasets[0].id
            setActiveDatasetId(latestId)
            loadEda(latestId)
          } else {
            setNoDataset(true)
            setLoading(false)
          }
        })
        .catch(() => { setNoDataset(true); setLoading(false) })
    }
  }, [])

  if (loading) return <div className="eda-page"><div className="state-message"><div className="spinner"></div><div>Analyzing data…</div></div></div>
  if (noDataset) return <div className="eda-page"><EmptyState skills={['Statistical Analysis', 'Data Types', 'Correlation Matrix', 'Outlier Detection']} /></div>
  if (error) return (
    <div className="eda-page">
      <div className="state-message" style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '18px' }}>Analysis Failed</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6' }}>{error}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
          Retry
        </button>
      </div>
    </div>
  )
  if (!data) return null

  const { shape, data_types, summary_stats, missing_data, total_missing, duplicate_analysis, correlation, outliers, histograms, numeric_columns } = data
  const corrLabels = correlation?.labels || []
  const corrMatrix = correlation?.matrix || []
  const histData = histograms?.[selectedCol] || []
  const maxCount = histData.length > 0 ? Math.max(...histData.map(d => d.count)) : 1

  const chartW = 420, chartH = 210, padL = 45, padR = 15, padT = 10, padB = 50
  const plotW = chartW - padL - padR, plotH = chartH - padT - padB
  const barGap = 6
  const barW = histData.length > 0 ? (plotW - barGap * (histData.length - 1)) / histData.length : plotW

  return (
    <div className="eda-page" id="eda-page-container">
      <div className="eda-header">
        <div>
          <h1 className="eda-title">Exploratory Data Analysis</h1>
          <p className="eda-subtitle">Deep statistical exploration of your dataset</p>
        </div>
        <div className="eda-header-right">
          <div className="eda-dataset-badge"><span className="eda-dataset-dot"></span>{datasetName || 'Dataset'}</div>
        </div>
      </div>

      {/* Shape + Data Types */}
      <div className="eda-summary-grid">
        <div className="eda-summary-card"><div className="eda-sum-label">Shape</div><div className="eda-sum-value indigo">{shape?.rows?.toLocaleString()} × {shape?.columns}</div></div>
        <div className="eda-summary-card"><div className="eda-sum-label">Numeric Columns</div><div className="eda-sum-value blue">{numeric_columns?.length || 0}</div></div>
        <div className="eda-summary-card"><div className="eda-sum-label">Total Missing</div><div className="eda-sum-value amber">{total_missing?.toLocaleString() || 0}</div></div>
        <div className="eda-summary-card"><div className="eda-sum-label">Duplicates</div><div className="eda-sum-value emerald">{duplicate_analysis?.count?.toLocaleString() || 0} ({duplicate_analysis?.percentage || 0}%)</div></div>
      </div>

      {/* Data Types Table */}
      {data_types?.length > 0 && (
        <div className="eda-card">
          <div className="eda-card-header"><div><h2 className="eda-card-title">Data Types</h2><p className="eda-card-sub">Column types and null counts</p></div></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead><tr><th>Column</th><th>Type</th><th>Non-Null</th><th>Null</th><th>Unique</th></tr></thead>
              <tbody>
                {data_types.map(dt => (
                  <tr key={dt.column}><td><span className="stats-col-name">{dt.column}</span></td><td><span className="stats-dtype">{dt.dtype}</span></td><td>{dt.non_null?.toLocaleString()}</td><td style={dt.null > 0 ? {color: '#f87171', fontWeight: 600} : {}}>{dt.null}</td><td>{dt.unique}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="eda-grid">
        {/* Summary Statistics */}
        {summary_stats?.length > 0 && (
          <div className="eda-card">
            <div className="eda-card-header"><div><h2 className="eda-card-title">Summary Statistics</h2><p className="eda-card-sub">Descriptive stats for numeric columns</p></div></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="stats-table">
                <thead><tr><th>Column</th><th>Mean</th><th>Std</th><th>Min</th><th>25%</th><th>50%</th><th>75%</th><th>Max</th></tr></thead>
                <tbody>
                  {summary_stats.map(s => (
                    <tr key={s.name}><td><span className="stats-col-name">{s.name}</span></td><td>{s.mean?.toLocaleString()}</td><td>{s.std?.toLocaleString()}</td><td>{s.min?.toLocaleString()}</td><td>{s['25%']?.toLocaleString()}</td><td>{s['50%']?.toLocaleString()}</td><td>{s['75%']?.toLocaleString()}</td><td>{s.max?.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Distribution Histogram */}
        {numeric_columns?.length > 0 && (
          <div className="eda-card">
            <div className="eda-card-header">
              <div><h2 className="eda-card-title">Distribution</h2><p className="eda-card-sub">Frequency distribution</p></div>
              <select className="eda-col-select" value={selectedCol} onChange={e => setSelectedCol(e.target.value)}>
                {numeric_columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {histData.length > 0 ? (
              <div className="histogram-chart">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="histogram-svg">
                  <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  <line x1={padL} y1={padT + plotH} x2={chartW - padR} y2={padT + plotH} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                  {[0.25, 0.5, 0.75, 1].map(pct => <line key={pct} x1={padL} y1={padT + plotH * (1-pct)} x2={chartW-padR} y2={padT + plotH * (1-pct)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4"/>)}
                  {histData.map((d, i) => {
                    const bH = (d.count / maxCount) * plotH
                    const x = padL + i * (barW + barGap)
                    const y = padT + plotH - bH
                    return (
                      <g key={d.range}>
                        <defs><linearGradient id={`hg-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.8"/><stop offset="100%" stopColor="#818cf8" stopOpacity="0.3"/></linearGradient></defs>
                        <rect x={x} y={y} width={barW} height={bH} rx="4" fill={`url(#hg-${i})`} className="hist-bar"/>
                        <text x={x + barW/2 + 5} y={padT + plotH + 16} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" transform={`rotate(-40, ${x + barW/2 + 5}, ${padT + plotH + 16})`}>{d.range}</text>
                        <text x={x + barW/2} y={y - 6} fill="rgba(255,255,255,0.45)" fontSize="10" textAnchor="middle" fontWeight="600">{d.count}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No histogram data for this column.</div>
            )}
          </div>
        )}
      </div>

      <div className="eda-bottom">
        {/* Correlation Matrix */}
        {corrLabels.length > 0 && (
          <div className="eda-card">
            <div className="eda-card-header"><div><h2 className="eda-card-title">Correlation Matrix</h2><p className="eda-card-sub">Pairwise correlation between numeric features</p></div></div>
            <div className="heatmap-wrap">
              <div className="heatmap-grid" style={{ gridTemplateColumns: `60px repeat(${corrLabels.length}, 1fr)`, gridTemplateRows: `28px repeat(${corrLabels.length}, 1fr)` }}>
                <div></div>
                {corrLabels.map(l => <div key={`h-${l}`} className="heatmap-label">{l}</div>)}
                {corrMatrix.map((row, i) => (
                  <div key={`row-${i}`} style={{ display: 'contents' }}>
                    <div className="heatmap-label">{corrLabels[i]}</div>
                    {row.map((val, j) => <div key={`${i}-${j}`} className="heatmap-cell" style={{ background: corrColor(val) }} title={`${corrLabels[i]} × ${corrLabels[j]}: ${val.toFixed(2)}`}>{val.toFixed(2)}</div>)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Missing Values */}
        <div className="eda-card">
          <div className="eda-card-header"><div><h2 className="eda-card-title">Missing Values</h2><p className="eda-card-sub">Null values per column</p></div></div>
          <div className="missing-list">
            {missing_data?.filter(m => m.count > 0).length > 0 ? missing_data.filter(m => m.count > 0).map(item => (
              <div key={item.col} className="missing-row">
                <div className="missing-info"><span className="missing-col-name">{item.col}</span><span className={`missing-pct ${item.level}`}>{item.pct}% ({item.count})</span></div>
                <div className="missing-bar-track"><div className={`missing-bar-fill ${item.level}`} style={{ width: `${Math.min(item.pct * 3, 100)}%` }}></div></div>
              </div>
            )) : (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>No missing values detected. ✓</div>
            )}
          </div>
        </div>
      </div>

      {/* Outlier Detection */}
      {outliers?.length > 0 && (
        <div className="eda-card" style={{ marginTop: 20 }}>
          <div className="eda-card-header"><div><h2 className="eda-card-title">Outlier Detection</h2><p className="eda-card-sub">IQR-based outlier analysis per numeric column</p></div></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table">
              <thead><tr><th>Column</th><th>Outliers</th><th>%</th><th>Q1</th><th>Q3</th><th>IQR</th><th>Lower Bound</th><th>Upper Bound</th></tr></thead>
              <tbody>
                {outliers.map(o => (
                  <tr key={o.column}><td><span className="stats-col-name">{o.column}</span></td><td style={o.count > 0 ? {color: '#f87171', fontWeight: 700} : {}}>{o.count}</td><td>{o.percentage}%</td><td>{o.Q1}</td><td>{o.Q3}</td><td>{o.IQR}</td><td>{o.lower_bound}</td><td>{o.upper_bound}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EDA
