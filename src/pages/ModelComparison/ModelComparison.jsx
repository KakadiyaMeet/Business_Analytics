import { useState, useEffect } from 'react'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import './ModelComparison.css'

const CLEANING_OPTIONS = [
  { key: 'mean', name: 'Fill with Mean' },
  { key: 'median', name: 'Fill with Median' },
  { key: 'mode', name: 'Fill with Mode' },
  { key: 'drop', name: 'Drop Columns' },
]

function ModelComparison() {
  const { activeDatasetId } = useDataset()

  const [noDataset, setNoDataset] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [columns, setColumns] = useState([])
  const [datasetName, setDatasetName] = useState('')

  // Form state
  const [targetColumn, setTargetColumn] = useState('')
  const [featureColumns, setFeatureColumns] = useState([])
  const [cleaningMethod, setCleaningMethod] = useState('mean')
  const [splitPct, setSplitPct] = useState(80)

  // Run state
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  // Load columns
  useEffect(() => {
    const dsId = activeDatasetId
    if (!dsId) { setNoDataset(true); setInitialLoading(false); return }

    axios.get(`/api/datasets/${dsId}/columns/`)
      .then(res => {
        setColumns(res.data.columns || [])
        setDatasetName(res.data.dataset_name || '')
        setInitialLoading(false)
      })
      .catch(() => setInitialLoading(false))
  }, [activeDatasetId])

  // Toggle feature chip
  const toggleFeature = (colName) => {
    if (colName === targetColumn) return
    setFeatureColumns(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    )
  }

  const handleTargetChange = (val) => {
    setTargetColumn(val)
    setFeatureColumns(prev => prev.filter(c => c !== val))
  }

  const isFormValid = targetColumn && featureColumns.length > 0

  // Run comparison
  const runComparison = async () => {
    const dsId = activeDatasetId
    if (!dsId || !isFormValid) return
    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const res = await axios.post(`/api/datasets/${dsId}/compare/`, {
        target_column: targetColumn,
        feature_columns: featureColumns,
        cleaning_method: cleaningMethod,
        split_pct: splitPct,
      })
      if (res.data.success === false) {
        setErrorMsg(res.data.message)
      } else {
        setResult(res.data)
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'An unexpected error occurred.')
    }
    setLoading(false)
  }

  const resetAll = () => {
    setResult(null)
    setErrorMsg('')
  }

  // ── Chart helpers ──
  const cW = 520, cH = 260, pL = 55, pR = 15, pT = 15, pB = 40

  const renderLineChart = (data, paramLabel, metricKey, lineColor) => {
    const pts = data.filter(d => d[metricKey] != null)
    if (pts.length === 0) return <div style={{ color: 'rgba(255,255,255,0.5)', padding: '20px 0', textAlign: 'center' }}>No data</div>

    const values = pts.map(p => p[metricKey])
    const mn = Math.min(...values)
    const mx = Math.max(...values)
    const rng = mx - mn || 1

    const xScale = (v) => pL + ((v - 1) / 99) * (cW - pL - pR)
    const yScale = (v) => (cH - pB) - ((v - mn) / rng) * (cH - pT - pB)

    const pathD = pts.map((p, i) => {
      const x = xScale(p.param_value)
      const y = yScale(p[metricKey])
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')

    // Axis ticks
    const xTicks = [1, 20, 40, 60, 80, 100]
    const ySteps = 5
    const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => mn + (rng / ySteps) * i)

    return (
      <svg viewBox={`0 0 ${cW} ${cH}`} className="mc-chart-svg">
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line key={i} x1={pL} y1={yScale(v)} x2={cW - pR} y2={yScale(v)}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}

        {/* Axes */}
        <line x1={pL} y1={pT} x2={pL} y2={cH - pB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={pL} y1={cH - pB} x2={cW - pR} y2={cH - pB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />

        {/* X labels */}
        {xTicks.map(t => (
          <text key={t} x={xScale(t)} y={cH - 8} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="middle">{t}</text>
        ))}

        {/* Y labels */}
        {yTicks.map((v, i) => (
          <text key={i} x={pL - 6} y={yScale(v) + 3} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="end">
            {v >= 1 ? v.toFixed(1) : v.toFixed(3)}
          </text>
        ))}

        {/* Axis titles */}
        <text x={cW / 2} y={cH - 0} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="middle">{paramLabel}</text>
        <text x="12" y={(cH - pB) / 2} fill="rgba(255,255,255,0.35)" fontSize="10" textAnchor="middle"
          transform={`rotate(-90, 12, ${(cH - pB) / 2})`}>
          {metricKey === 'accuracy' ? 'Accuracy' : 'R² Score'}
        </text>
      </svg>
    )
  }

  // Find best row
  const findBest = (data, metricKey) => {
    const valid = data.filter(d => d[metricKey] != null)
    if (valid.length === 0) return null
    return valid.reduce((best, cur) => (cur[metricKey] > best[metricKey] ? cur : best), valid[0])
  }

  // ── Render Results ──
  const renderResults = () => {
    if (!result) return null
    const { knn_results, dt_results, is_classification } = result
    const primaryMetric = is_classification ? 'accuracy' : 'r2'
    const metricLabel = is_classification ? 'Accuracy' : 'R² Score'

    const bestKNN = findBest(knn_results, primaryMetric)
    const bestDT = findBest(dt_results, primaryMetric)

    return (
      <>
        <div className="mc-results-header">
          <h2 className="mc-results-title">Comparison Results</h2>
          <button className="mc-btn-reset" onClick={resetAll}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            New Comparison
          </button>
        </div>

        {/* Config summary */}
        <div className="mc-card">
          <div className="mc-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Comparison Configuration
          </div>
          <div className="mc-config-grid">
            <div className="mc-config-item"><div className="mc-config-label">Dataset</div><div className="mc-config-value">{result.dataset_name}</div></div>
            <div className="mc-config-item"><div className="mc-config-label">Target</div><div className="mc-config-value">{result.target_column}</div></div>
            <div className="mc-config-item"><div className="mc-config-label">Features</div><div className="mc-config-value">{result.feature_columns?.join(', ')}</div></div>
            <div className="mc-config-item"><div className="mc-config-label">Split</div><div className="mc-config-value">{result.split_pct}% / {100 - result.split_pct}%</div></div>
            <div className="mc-config-item"><div className="mc-config-label">Training Records</div><div className="mc-config-value">{result.training_records?.toLocaleString()}</div></div>
            <div className="mc-config-item"><div className="mc-config-label">Testing Records</div><div className="mc-config-value">{result.testing_records?.toLocaleString()}</div></div>
          </div>
        </div>

        {/* Best Value Badges */}
        <div className="mc-best-cards">
          <div className="mc-best-card">
            <div className="mc-best-model">🎯 Best KNN</div>
            <div className="mc-best-value">
              {bestKNN ? (is_classification ? `${(bestKNN[primaryMetric] * 100).toFixed(2)}%` : bestKNN[primaryMetric]?.toFixed(4)) : 'N/A'}
            </div>
            <div className="mc-best-param">{bestKNN ? `K = ${bestKNN.param_value}` : ''}</div>
            <div className="mc-best-metric">{metricLabel}</div>
          </div>
          <div className="mc-best-card">
            <div className="mc-best-model">🌳 Best Decision Tree</div>
            <div className="mc-best-value">
              {bestDT ? (is_classification ? `${(bestDT[primaryMetric] * 100).toFixed(2)}%` : bestDT[primaryMetric]?.toFixed(4)) : 'N/A'}
            </div>
            <div className="mc-best-param">{bestDT ? `max_depth = ${bestDT.param_value}` : ''}</div>
            <div className="mc-best-metric">{metricLabel}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="mc-charts">
          <div className="mc-chart-card">
            <div className="mc-chart-title">KNN — {metricLabel} vs n_neighbors</div>
            <div className="mc-chart-sub">K = 1 to 100</div>
            {renderLineChart(knn_results, 'n_neighbors (K)', primaryMetric, '#fff')}
          </div>
          <div className="mc-chart-card">
            <div className="mc-chart-title">Decision Tree — {metricLabel} vs max_depth</div>
            <div className="mc-chart-sub">max_depth = 1 to 100</div>
            {renderLineChart(dt_results, 'max_depth', primaryMetric, '#ffd54f')}
          </div>
        </div>

        {/* Tables */}
        <div className="mc-tables">
          <div className="mc-table-card">
            <div className="mc-table-title">🎯 KNN Results (n_neighbors = 1 – 100)</div>
            <div className="mc-table-sub">Sorted by parameter value</div>
            <div className="mc-table-scroll">
              <table className="mc-table">
                <thead>
                  <tr>
                    <th>K</th>
                    {is_classification && <th>Accuracy</th>}
                    <th>R²</th>
                    <th>MAE</th>
                    <th>MSE</th>
                    {is_classification && <th>Precision</th>}
                    {is_classification && <th>Recall</th>}
                    {is_classification && <th>F1</th>}
                  </tr>
                </thead>
                <tbody>
                  {knn_results.map(row => (
                    <tr key={row.param_value} className={bestKNN && row.param_value === bestKNN.param_value ? 'mc-best-row' : ''}>
                      <td>{row.param_value}</td>
                      {is_classification && <td>{row.accuracy != null ? (row.accuracy * 100).toFixed(2) + '%' : '—'}</td>}
                      <td>{row.r2 != null ? row.r2.toFixed(4) : '—'}</td>
                      <td>{row.mae != null ? row.mae.toFixed(2) : '—'}</td>
                      <td>{row.mse != null ? row.mse.toFixed(2) : '—'}</td>
                      {is_classification && <td>{row.precision != null ? (row.precision * 100).toFixed(2) + '%' : '—'}</td>}
                      {is_classification && <td>{row.recall != null ? (row.recall * 100).toFixed(2) + '%' : '—'}</td>}
                      {is_classification && <td>{row.f1_score != null ? (row.f1_score * 100).toFixed(2) + '%' : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mc-table-card">
            <div className="mc-table-title">🌳 Decision Tree Results (max_depth = 1 – 100)</div>
            <div className="mc-table-sub">Sorted by parameter value</div>
            <div className="mc-table-scroll">
              <table className="mc-table">
                <thead>
                  <tr>
                    <th>Depth</th>
                    {is_classification && <th>Accuracy</th>}
                    <th>R²</th>
                    <th>MAE</th>
                    <th>MSE</th>
                    {is_classification && <th>Precision</th>}
                    {is_classification && <th>Recall</th>}
                    {is_classification && <th>F1</th>}
                  </tr>
                </thead>
                <tbody>
                  {dt_results.map(row => (
                    <tr key={row.param_value} className={bestDT && row.param_value === bestDT.param_value ? 'mc-best-row' : ''}>
                      <td>{row.param_value}</td>
                      {is_classification && <td>{row.accuracy != null ? (row.accuracy * 100).toFixed(2) + '%' : '—'}</td>}
                      <td>{row.r2 != null ? row.r2.toFixed(4) : '—'}</td>
                      <td>{row.mae != null ? row.mae.toFixed(2) : '—'}</td>
                      <td>{row.mse != null ? row.mse.toFixed(2) : '—'}</td>
                      {is_classification && <td>{row.precision != null ? (row.precision * 100).toFixed(2) + '%' : '—'}</td>}
                      {is_classification && <td>{row.recall != null ? (row.recall * 100).toFixed(2) + '%' : '—'}</td>}
                      {is_classification && <td>{row.f1_score != null ? (row.f1_score * 100).toFixed(2) + '%' : '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Main Render ──
  return (
    <div className="mc-page">
      <div className="mc-header">
        <h1 className="mc-title">Hello</h1>
        <p className="mc-subtitle">Run KNN (K=1–100) and Decision Tree (depth=1–100) in one shot and compare all results</p>
      </div>

      {initialLoading ? (
        <div className="mc-loading"><div className="spinner"></div><div>Loading dataset info…</div></div>
      ) : noDataset ? (
        <EmptyState skills={['KNN Comparison', 'Decision Tree Comparison', 'Hyperparameter Tuning']} />
      ) : columns.length === 0 ? (
        <div className="mc-error">No columns found in the dataset. Please upload a valid CSV file.</div>
      ) : result ? (
        renderResults()
      ) : (
        <>
          {/* Target & Cleaning */}
          <div className="mc-card">
            <div className="mc-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              Configure Comparison
            </div>
            <div className="mc-card-desc">Select target, features, cleaning method and train/test split, then run the batch comparison.</div>

            <div className="mc-form-grid">
              <div className="mc-form-group">
                <label className="mc-form-label">Target Column</label>
                <select className="mc-select" value={targetColumn} onChange={e => handleTargetChange(e.target.value)}>
                  <option value="">— Select Target Column —</option>
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.is_numeric ? 'numeric' : 'categorical'})</option>
                  ))}
                </select>
              </div>

              <div className="mc-form-group">
                <label className="mc-form-label">Cleaning Method</label>
                <select className="mc-select" value={cleaningMethod} onChange={e => setCleaningMethod(e.target.value)}>
                  {CLEANING_OPTIONS.map(o => (
                    <option key={o.key} value={o.key}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="mc-form-group">
                <label className="mc-form-label">Train / Test Split</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="range" className="mc-input" min="50" max="95" step="5"
                    value={splitPct} onChange={e => setSplitPct(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }} />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', minWidth: 70 }}>
                    {splitPct}% / {100 - splitPct}%
                  </span>
                </div>
              </div>

              <div className="mc-form-group full-width">
                <label className="mc-form-label">Feature Columns ({featureColumns.length} selected)</label>
                <div className="mc-feature-grid">
                  {columns.map(c => {
                    const isTarget = c.name === targetColumn
                    const isSelected = featureColumns.includes(c.name)
                    return (
                      <div
                        key={c.name}
                        className={`mc-feature-chip ${isSelected ? 'selected' : ''} ${isTarget ? 'disabled' : ''}`}
                        onClick={() => !isTarget && toggleFeature(c.name)}
                      >
                        <div className="mc-chip-check">
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <span>{c.name}</span>
                        <span className="mc-chip-type">{c.is_numeric ? 'NUM' : 'CAT'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {errorMsg && <div className="mc-error">{errorMsg}</div>}

            <button className="mc-btn-run" onClick={runComparison} disabled={loading || !isFormValid}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {loading ? 'Running Comparison… (this may take a minute)' : 'Run Comparison (KNN 1–100 + Decision Tree 1–100)'}
            </button>
          </div>

          {loading && (
            <div className="mc-loading">
              <div className="spinner"></div>
              <div>Training 200 models (KNN × 100 + Decision Tree × 100)…</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>This may take 30–90 seconds depending on dataset size</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ModelComparison
