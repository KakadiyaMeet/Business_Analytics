import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import './Prediction.css'

const STEPS = [
  { id: 1, label: 'Columns' },
  { id: 2, label: 'Cleaning' },
  { id: 3, label: 'Split' },
  { id: 4, label: 'Model' },
  { id: 5, label: 'Parameters' },
]

const MODELS = [
  { key: 'linear_regression', name: 'Linear Regression', type: 'Regression', icon: '📈' },
  { key: 'multiple_linear_regression', name: 'Multiple Linear Regression', type: 'Regression', icon: '📊' },
  { key: 'polynomial_regression', name: 'Polynomial Regression', type: 'Regression', icon: '📐' },
  { key: 'knn', name: 'K-Nearest Neighbors (KNN)', type: 'Both', icon: '🎯' },
  { key: 'svm', name: 'Support Vector Machine (SVM)', type: 'Both', icon: '⚡' },
  { key: 'decision_tree', name: 'Decision Tree (Entropy)', type: 'Both', icon: '🌳' },
  { key: 'random_forest', name: 'Random Forest', type: 'Both', icon: '🌲' },
]

const CLEANING_OPTIONS = [
  { key: 'mean', name: 'Fill with Mean', desc: 'Replace missing values with column average (numeric only)' },
  { key: 'median', name: 'Fill with Median', desc: 'Replace missing values with column median (numeric only)' },
  { key: 'mode', name: 'Fill with Mode', desc: 'Replace missing values with most frequent value (all types)' },
  { key: 'drop', name: 'Drop Columns', desc: 'Remove columns that contain any missing values' },
]

function Prediction() {
  const { activeDatasetId } = useDataset()
  // Helper to restore saved state from sessionStorage
  const getSaved = () => {
    try {
      const raw = sessionStorage.getItem('predictionState')
      if (raw) {
        const saved = JSON.parse(raw)
        const dsId = activeDatasetId
        // Only restore if same dataset
        if (saved.datasetId === dsId) return saved
      }
    } catch { /* ignore */ }
    return null
  }

  const saved = getSaved()

  const [noDataset, setNoDataset] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [columns, setColumns] = useState([])
  const [datasetName, setDatasetName] = useState(saved?.datasetName || '')

  // Step state
  const [currentStep, setCurrentStep] = useState(saved?.currentStep || 1)

  // Step 1 — Column Selection
  const [targetColumn, setTargetColumn] = useState(saved?.targetColumn || '')
  const [featureColumns, setFeatureColumns] = useState(saved?.featureColumns || [])

  // Step 2 — Data Cleaning
  const [cleaningMethod, setCleaningMethod] = useState(saved?.cleaningMethod || 'mean')

  // Step 3 — Train/Test Split
  const [splitPct, setSplitPct] = useState(saved?.splitPct || 80)

  // Step 4 — Model Selection
  const [selectedModel, setSelectedModel] = useState(saved?.selectedModel || '')

  // Step 5 — Model Parameters
  const [modelParams, setModelParams] = useState(saved?.modelParams || {})

  // Training & Results
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(saved?.result || null)
  const [errorMsg, setErrorMsg] = useState('')

  // Save state to sessionStorage whenever important state changes
  useEffect(() => {
    const dsId = activeDatasetId
    if (!dsId) return
    const stateToSave = {
      datasetId: dsId,
      datasetName,
      currentStep,
      targetColumn,
      featureColumns,
      cleaningMethod,
      splitPct,
      selectedModel,
      modelParams,
      result,
    }
    sessionStorage.setItem('predictionState', JSON.stringify(stateToSave))
  }, [datasetName, currentStep, targetColumn, featureColumns, cleaningMethod, splitPct, selectedModel, modelParams, result])

  useEffect(() => {
    const dsId = activeDatasetId
    if (!dsId) { setNoDataset(true); setInitialLoading(false); return }

    axios.get(`/api/datasets/${dsId}/columns/`)
      .then(res => {
        setColumns(res.data.columns || [])
        setDatasetName(res.data.dataset_name || '')
        setInitialLoading(false)
      })
      .catch(() => { setInitialLoading(false) })
  }, [])

  // Reset params when model changes (skip initial mount to preserve restored state)
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setModelParams({})
  }, [selectedModel])

  // Toggle feature column
  const toggleFeature = (colName) => {
    if (colName === targetColumn) return
    setFeatureColumns(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    )
  }

  // When target changes, remove it from features
  const handleTargetChange = (val) => {
    setTargetColumn(val)
    setFeatureColumns(prev => prev.filter(c => c !== val))
  }

  // Param update helper
  const updateParam = (key, value) => {
    setModelParams(prev => ({ ...prev, [key]: value }))
  }

  // Validate current step
  const isStepValid = (step) => {
    switch (step) {
      case 1: return targetColumn && featureColumns.length > 0
      case 2: return true
      case 3: return true
      case 4: return selectedModel !== ''
      case 5: return true
      default: return false
    }
  }

  // Navigate steps
  const goNext = () => { if (currentStep < 5 && isStepValid(currentStep)) setCurrentStep(currentStep + 1) }
  const goBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1) }

  // Train model
  const trainModel = async () => {
    const dsId = activeDatasetId
    if (!dsId) return
    setLoading(true)
    setErrorMsg('')
    setResult(null)

    try {
      const res = await axios.post(`/api/datasets/${dsId}/predict/`, {
        target_column: targetColumn,
        feature_columns: featureColumns,
        cleaning_method: cleaningMethod,
        split_pct: splitPct,
        model_type: selectedModel,
        model_params: modelParams,
      })
      if (res.data.success === false) {
        setErrorMsg(res.data.message)
      } else {
        setResult(res.data)
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'An unexpected error occurred. Please try again.'
      setErrorMsg(msg)
    }
    setLoading(false)
  }

  // Reset to start over
  const resetAll = () => {
    setCurrentStep(1)
    setTargetColumn('')
    setFeatureColumns([])
    setCleaningMethod('mean')
    setSplitPct(80)
    setSelectedModel('')
    setModelParams({})
    setResult(null)
    setErrorMsg('')
    sessionStorage.removeItem('predictionState')
  }

  // Chart dimensions
  const cW = 420, cH = 260, pL = 50, pR = 15, pT = 15, pB = 40

  // ── Render Helpers ──

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderColumnSelection()
      case 2: return renderDataCleaning()
      case 3: return renderSplitSlider()
      case 4: return renderModelSelection()
      case 5: return renderModelParams()
      default: return null
    }
  }

  // ── Step 1: Column Selection ──
  const renderColumnSelection = () => (
    <div className="pred-step-content">
      <h2 className="pred-step-content-title">Column Selection</h2>
      <p className="pred-step-content-desc">Choose the target column to predict and the feature columns to use for training.</p>

      <div className="pred-col-section">
        <div className="pred-col-section-label">Target Column</div>
        <select className="pred-target-select" value={targetColumn} onChange={e => handleTargetChange(e.target.value)}>
          <option value="">— Select Target Column —</option>
          {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.is_numeric ? 'numeric' : 'categorical'})</option>)}
        </select>
      </div>

      <div className="pred-col-section">
        <div className="pred-col-section-label">Feature Columns ({featureColumns.length} selected)</div>
        <div className="pred-feature-grid">
          {columns.map(c => {
            const isTarget = c.name === targetColumn
            const isSelected = featureColumns.includes(c.name)
            return (
              <div
                key={c.name}
                className={`pred-feature-chip ${isSelected ? 'selected' : ''} ${isTarget ? 'disabled' : ''}`}
                onClick={() => !isTarget && toggleFeature(c.name)}
              >
                <div className="pred-feature-checkbox">
                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="pred-feature-chip-label">{c.name}</span>
                <span className={`pred-feature-chip-type ${c.is_numeric ? 'numeric' : 'categorical'}`}>
                  {c.is_numeric ? 'NUM' : 'CAT'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {!isStepValid(1) && targetColumn && (
        <div className="pred-error-msg">At least one Feature Column must be selected.</div>
      )}
    </div>
  )

  // ── Step 2: Data Cleaning ──
  const renderDataCleaning = () => (
    <div className="pred-step-content">
      <h2 className="pred-step-content-title">Data Cleaning</h2>
      <p className="pred-step-content-desc">Choose how missing values should be handled before training the model.</p>
      <div className="pred-cleaning-grid">
        {CLEANING_OPTIONS.map(opt => (
          <div
            key={opt.key}
            className={`pred-cleaning-option ${cleaningMethod === opt.key ? 'selected' : ''}`}
            onClick={() => setCleaningMethod(opt.key)}
          >
            <div className="pred-cleaning-radio">
              <div className="pred-cleaning-radio-dot" />
            </div>
            <div className="pred-cleaning-info">
              <div className="pred-cleaning-name">{opt.name}</div>
              <div className="pred-cleaning-desc">{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Step 3: Train/Test Split ──
  const renderSplitSlider = () => {
    const sliderFill = ((splitPct - 50) / (95 - 50)) * 100
    const ticks = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
    return (
      <div className="pred-step-content">
        <h2 className="pred-step-content-title">Train / Test Split</h2>
        <p className="pred-step-content-desc">Adjust the ratio of training data to testing data using the slider below.</p>
        <div className="pred-slider-container">
          <div className="pred-slider-visual">
            <div className="pred-slider-train" style={{ width: `${splitPct}%` }}>
              <span className="pred-slider-train-label">Train {splitPct}%</span>
            </div>
            <div className="pred-slider-test" style={{ width: `${100 - splitPct}%` }}>
              <span className="pred-slider-test-label">Test {100 - splitPct}%</span>
            </div>
          </div>
          <div className="pred-slider-input-wrapper">
            <input
              type="range" min="50" max="95" step="5"
              value={splitPct}
              onChange={e => setSplitPct(Number(e.target.value))}
              className="pred-slider-input"
              style={{ '--slider-fill': `${sliderFill}%` }}
            />
          </div>
          <div className="pred-slider-ticks">
            {ticks.map(t => (
              <span key={t} className={`pred-slider-tick ${t === splitPct ? 'active' : ''}`}>{t}%</span>
            ))}
          </div>
          <div className="pred-split-summary">
            <div className="pred-split-box train">
              <div className="pred-split-box-label">Training Data</div>
              <div className="pred-split-box-value">{splitPct}%</div>
            </div>
            <div className="pred-split-box test">
              <div className="pred-split-box-label">Testing Data</div>
              <div className="pred-split-box-value">{100 - splitPct}%</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4: Model Selection ──
  const renderModelSelection = () => (
    <div className="pred-step-content">
      <h2 className="pred-step-content-title">Select ML Model</h2>
      <p className="pred-step-content-desc">Choose exactly one machine learning model to train on your data.</p>
      <div className="pred-model-grid">
        {MODELS.map(m => (
          <div
            key={m.key}
            className={`pred-model-card ${selectedModel === m.key ? 'selected' : ''}`}
            onClick={() => setSelectedModel(m.key)}
          >
            <div className="pred-model-card-icon" style={{ background: selectedModel === m.key ? 'var(--indigo-dim)' : 'var(--bg-card)' }}>
              {m.icon}
            </div>
            <div className="pred-model-card-name">{m.name}</div>
            <div className="pred-model-card-type">{m.type}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Step 5: Model Parameters ──
  const renderModelParams = () => {
    const renderParams = () => {
      switch (selectedModel) {
        case 'linear_regression':
        case 'multiple_linear_regression':
          return <div className="pred-no-params">No additional parameters required for this model.</div>

        case 'polynomial_regression':
          return (
            <div className="pred-params-grid">
              <div className="pred-param-group">
                <label className="pred-param-label">Degree</label>
                <input type="number" className="pred-param-input" min="1" placeholder="e.g. 2"
                  value={modelParams.degree || ''} onChange={e => updateParam('degree', e.target.value)} />
              </div>
            </div>
          )

        case 'knn':
          return (
            <div className="pred-params-grid">
              <div className="pred-param-group">
                <label className="pred-param-label">Number of Neighbors (K)</label>
                <input type="number" className="pred-param-input" min="1" placeholder="e.g. 5"
                  value={modelParams.n_neighbors || ''} onChange={e => updateParam('n_neighbors', e.target.value)} />
              </div>
            </div>
          )

        case 'svm':
          return (
            <div className="pred-params-grid">
              <div className="pred-param-group">
                <label className="pred-param-label">C Value</label>
                <input type="number" className="pred-param-input" min="0.01" step="0.1" placeholder="e.g. 1.0"
                  value={modelParams.c_value || ''} onChange={e => updateParam('c_value', e.target.value)} />
              </div>
              <div className="pred-param-group">
                <label className="pred-param-label">Kernel</label>
                <select className="pred-param-select" value={modelParams.kernel || 'rbf'} onChange={e => updateParam('kernel', e.target.value)}>
                  <option value="linear">Linear</option>
                  <option value="rbf">RBF</option>
                  <option value="poly">Polynomial</option>
                  <option value="sigmoid">Sigmoid</option>
                </select>
              </div>
            </div>
          )

        case 'decision_tree':
          return (
            <div className="pred-params-grid">
              <div className="pred-param-group">
                <label className="pred-param-label">Maximum Depth</label>
                <input type="number" className="pred-param-input" min="1" placeholder="Leave empty for no limit"
                  value={modelParams.max_depth || ''} onChange={e => updateParam('max_depth', e.target.value)} />
              </div>
              <div className="pred-param-group">
                <label className="pred-param-label">Minimum Samples Split</label>
                <input type="number" className="pred-param-input" min="2" placeholder="e.g. 2"
                  value={modelParams.min_samples_split || ''} onChange={e => updateParam('min_samples_split', e.target.value)} />
              </div>
            </div>
          )

        case 'random_forest':
          return (
            <div className="pred-params-grid">
              <div className="pred-param-group">
                <label className="pred-param-label">Number of Trees</label>
                <input type="number" className="pred-param-input" min="1" placeholder="e.g. 100"
                  value={modelParams.n_estimators || ''} onChange={e => updateParam('n_estimators', e.target.value)} />
              </div>
              <div className="pred-param-group">
                <label className="pred-param-label">Maximum Depth</label>
                <input type="number" className="pred-param-input" min="1" placeholder="Leave empty for no limit"
                  value={modelParams.max_depth || ''} onChange={e => updateParam('max_depth', e.target.value)} />
              </div>
              <div className="pred-param-group">
                <label className="pred-param-label">Minimum Samples Split</label>
                <input type="number" className="pred-param-input" min="2" placeholder="e.g. 2"
                  value={modelParams.min_samples_split || ''} onChange={e => updateParam('min_samples_split', e.target.value)} />
              </div>
            </div>
          )

        default:
          return <div className="pred-no-params">Select a model first.</div>
      }
    }

    const modelInfo = MODELS.find(m => m.key === selectedModel)

    return (
      <div className="pred-step-content">
        <h2 className="pred-step-content-title">Model Parameters — {modelInfo?.name || ''}</h2>
        <p className="pred-step-content-desc">Configure the hyperparameters for your selected model. Default values will be used for empty fields.</p>
        {renderParams()}
      </div>
    )
  }

  // ── Render Results ──
  const renderResults = () => {
    if (!result) return null
    const { metrics, is_classification, scatter_pts, error_pts, feature_importance, supports_feature_importance } = result
    const cleaningLabel = CLEANING_OPTIONS.find(c => c.key === result.cleaning_method)?.name || result.cleaning_method
    const modelInfo = MODELS.find(m => m.key === result.model_type)

    return (
      <div className="pred-results">
        <div className="pred-results-header">
          <h2 className="pred-results-title">Prediction Results</h2>
          <button className="pred-btn-reset" onClick={resetAll}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            New Prediction
          </button>
        </div>

        {/* Config Summary */}
        <div className="pred-config-card">
          <div className="pred-config-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--indigo-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Training Configuration
          </div>
          <div className="pred-config-grid">
            <div className="pred-config-item"><div className="pred-config-label">Dataset</div><div className="pred-config-value">{result.dataset_name}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Target Column</div><div className="pred-config-value">{result.target_column}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Feature Columns</div><div className="pred-config-value">{result.feature_columns?.join(', ')}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">ML Model</div><div className="pred-config-value">{result.model_name}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Cleaning Method</div><div className="pred-config-value">{cleaningLabel}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Train / Test Split</div><div className="pred-config-value">{result.split_pct}% / {100 - result.split_pct}%</div></div>
            {result.model_params && Object.keys(result.model_params).length > 0 && (
              <div className="pred-config-item"><div className="pred-config-label">Parameters</div><div className="pred-config-value">{Object.entries(result.model_params).map(([k,v]) => `${k}: ${v ?? 'None'}`).join(', ')}</div></div>
            )}
            <div className="pred-config-item"><div className="pred-config-label">Training Records</div><div className="pred-config-value">{result.training_records?.toLocaleString()}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Testing Records</div><div className="pred-config-value">{result.testing_records?.toLocaleString()}</div></div>
            <div className="pred-config-item"><div className="pred-config-label">Training Time</div><div className="pred-config-value">{result.training_time}s</div></div>
          </div>
        </div>

        {/* Metrics */}
        <div className="metrics-grid">
          {metrics.accuracy != null && (
            <div className="metric-card"><div className="metric-label">Accuracy</div><div className={`metric-value ${metrics.accuracy >= 0.9 ? 'good' : metrics.accuracy >= 0.7 ? 'warn' : 'poor'}`}>{(metrics.accuracy * 100).toFixed(2)}%</div><div className="metric-sub">Overall correctness</div></div>
          )}
          {metrics.precision != null && (
            <div className="metric-card"><div className="metric-label">Precision</div><div className="metric-value accent">{(metrics.precision * 100).toFixed(2)}%</div><div className="metric-sub">Positive predictive value</div></div>
          )}
          {metrics.recall != null && (
            <div className="metric-card"><div className="metric-label">Recall</div><div className="metric-value info">{(metrics.recall * 100).toFixed(2)}%</div><div className="metric-sub">Sensitivity</div></div>
          )}
          {metrics.f1_score != null && (
            <div className="metric-card"><div className="metric-label">F1 Score</div><div className="metric-value accent">{(metrics.f1_score * 100).toFixed(2)}%</div><div className="metric-sub">Harmonic mean</div></div>
          )}
          {metrics.r2 != null && (
            <div className="metric-card"><div className="metric-label">R² Score</div><div className={`metric-value ${metrics.r2 >= 0.7 ? 'good' : metrics.r2 >= 0.5 ? 'warn' : 'poor'}`}>{metrics.r2?.toFixed(4)}</div><div className="metric-sub">{metrics.r2 >= 0.9 ? 'Excellent' : metrics.r2 >= 0.7 ? 'Good' : metrics.r2 >= 0.5 ? 'Moderate' : 'Poor'} fit</div></div>
          )}
          {metrics.mae != null && (
            <div className="metric-card"><div className="metric-label">MAE</div><div className="metric-value info">{metrics.mae?.toFixed(4)}</div><div className="metric-sub">Mean Absolute Error</div></div>
          )}
          {metrics.mse != null && (
            <div className="metric-card"><div className="metric-label">MSE</div><div className="metric-value warn">{metrics.mse?.toFixed(4)}</div><div className="metric-sub">Mean Squared Error</div></div>
          )}
        </div>

        {/* Confusion Matrix */}
        {metrics.confusion_matrix && (
          <div className="pred-cm-card">
            <div className="pred-cm-title">Confusion Matrix</div>
            <table className="pred-cm-table">
              <tbody>
                {metrics.confusion_matrix.map((row, i) => (
                  <tr key={i}>
                    {row.map((val, j) => (
                      <td key={j} className={i === j ? 'cm-diag' : 'cm-cell'}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Charts */}
        <div className="pred-charts">
          {/* Actual vs Predicted */}
          <div className="pred-chart-card">
            <div className="pred-chart-title">Actual vs Predicted</div>
            <div className="pred-chart-sub">How well predictions match real values</div>
            {scatter_pts && scatter_pts.length > 0 && (() => {
              const allA = scatter_pts.map(p => p.actual), allP = scatter_pts.map(p => p.pred)
              const mn = Math.min(...allA, ...allP), mx = Math.max(...allA, ...allP), rng = mx - mn || 1
              return (
                <svg viewBox={`0 0 ${cW} ${cH}`} className="pred-scatter-svg">
                  <line x1={pL} y1={pT} x2={pL} y2={cH-pB} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  <line x1={pL} y1={cH-pB} x2={cW-pR} y2={cH-pB} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                  <line x1={pL} y1={cH-pB} x2={cW-pR} y2={pT} stroke="rgba(99,102,241,0.12)" strokeWidth="1.5" strokeDasharray="6"/>
                  {scatter_pts.map((pt, i) => {
                    const cx = pL + ((pt.actual - mn) / rng) * (cW - pL - pR)
                    const cy = (cH - pB) - ((pt.pred - mn) / rng) * (cH - pT - pB)
                    return <circle key={i} cx={cx} cy={cy} r="4" fill="rgba(99,102,241,0.6)" className="pred-dot"/>
                  })}
                  <text x={cW/2} y={cH-8} fill="rgba(255,255,255,0.25)" fontSize="10" textAnchor="middle">Actual</text>
                  <text x="14" y={(cH-pB)/2} fill="rgba(255,255,255,0.25)" fontSize="10" textAnchor="middle" transform={`rotate(-90, 14, ${(cH-pB)/2})`}>Predicted</text>
                </svg>
              )
            })()}
          </div>

          {/* Prediction Error */}
          <div className="pred-chart-card">
            <div className="pred-chart-title">Prediction Error</div>
            <div className="pred-chart-sub">Residuals distribution (Actual − Predicted)</div>
            {error_pts && error_pts.length > 0 && (() => {
              const allPr = error_pts.map(p => p.pred), allR = error_pts.map(p => p.residual)
              const prMn = Math.min(...allPr), prMx = Math.max(...allPr), prRng = prMx - prMn || 1
              const rMn = Math.min(...allR), rMx = Math.max(...allR), rRng = rMx - rMn || 1
              const zeroY = (cH - pB) - ((0 - rMn) / rRng) * (cH - pT - pB)
              return (
                <svg viewBox={`0 0 ${cW} ${cH}`} className="pred-scatter-svg">
                  <line x1={pL} y1={pT} x2={pL} y2={cH-pB} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  <line x1={pL} y1={cH-pB} x2={cW-pR} y2={cH-pB} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
                  <line x1={pL} y1={Math.max(pT, Math.min(cH-pB, zeroY))} x2={cW-pR} y2={Math.max(pT, Math.min(cH-pB, zeroY))} stroke="rgba(244,63,94,0.2)" strokeWidth="1" strokeDasharray="4"/>
                  {error_pts.map((pt, i) => {
                    const cx = pL + ((pt.pred - prMn) / prRng) * (cW - pL - pR)
                    const cy = (cH - pB) - ((pt.residual - rMn) / rRng) * (cH - pT - pB)
                    const clr = pt.residual >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(244,63,94,0.6)'
                    return <circle key={i} cx={cx} cy={cy} r="4" fill={clr} className="pred-dot"/>
                  })}
                  <text x={cW/2} y={cH-8} fill="rgba(255,255,255,0.25)" fontSize="10" textAnchor="middle">Predicted</text>
                  <text x="14" y={(cH-pB)/2} fill="rgba(255,255,255,0.25)" fontSize="10" textAnchor="middle" transform={`rotate(-90, 14, ${(cH-pB)/2})`}>Residual</text>
                </svg>
              )
            })()}
          </div>
        </div>

        {/* Feature Importance */}
        {supports_feature_importance && feature_importance && feature_importance.length > 0 && (
          <div className="pred-fi-card">
            <div className="pred-chart-title">Feature Importance</div>
            <div className="pred-chart-sub" style={{ marginBottom: 18 }}>Relative contribution of each feature to predictions</div>
            <div className="fi-list">
              {feature_importance.map(fi => (
                <div key={fi.name} className="fi-row">
                  <div className="fi-info"><span className="fi-name">{fi.name}</span><span className="fi-score">{(fi.score * 100).toFixed(1)}%</span></div>
                  <div className="fi-bar-track"><div className="fi-bar-fill" style={{ width: `${Math.min(fi.score * 100 * 2, 100)}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main Render ──
  return (
    <div className="pred-page">
      <div className="pred-header">
        <div>
          <h1 className="pred-title">ML Prediction</h1>
          <p className="pred-subtitle">Configure and train machine learning models step by step</p>
        </div>
      </div>

      {initialLoading ? (
        <div className="state-message"><div className="spinner"></div><div>Loading dataset info…</div></div>
      ) : noDataset ? (
        <EmptyState skills={['Model Training', 'Regression & Classification', 'Evaluation Metrics', 'Feature Importance']} />
      ) : columns.length === 0 ? (
        <div className="pred-message">No columns found in the dataset. Please upload a valid CSV file.</div>
      ) : result ? (
        renderResults()
      ) : (
        <>
          {/* Stepper */}
          <div className="pred-stepper">
            {STEPS.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className={`pred-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                  onClick={() => { if (step.id < currentStep || (step.id === currentStep + 1 && isStepValid(currentStep))) setCurrentStep(step.id) }}
                >
                  <div className="pred-step-num">
                    {currentStep > step.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : step.id}
                  </div>
                  <span className="pred-step-label">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`pred-step-connector ${currentStep > step.id ? 'completed' : ''}`}/>
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Error Message */}
          {errorMsg && <div className="pred-error-msg">{errorMsg}</div>}

          {/* Actions */}
          <div className="pred-actions">
            <div>
              {currentStep > 1 && (
                <button className="pred-btn-back" onClick={goBack}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
              )}
            </div>
            <div>
              {currentStep < 5 ? (
                <button className="pred-btn-next" onClick={goNext} disabled={!isStepValid(currentStep)}>
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ) : (
                <button className="pred-btn-train" onClick={trainModel} disabled={loading || !isStepValid(4)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  {loading ? 'Training Model…' : 'Train Model'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Prediction
