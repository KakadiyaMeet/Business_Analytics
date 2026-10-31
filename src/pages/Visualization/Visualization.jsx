import { useState, useEffect } from 'react'
import axios from 'axios'
import { useDataset } from '../../context/DatasetContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import './Visualization.css'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899']

function corrColor(val) {
  if (val >= 0.7) return 'rgba(34, 197, 94, 0.7)'
  if (val >= 0.4) return 'rgba(34, 197, 94, 0.4)'
  if (val >= 0.1) return 'rgba(34, 197, 94, 0.18)'
  if (val >= -0.1) return 'rgba(255, 255, 255, 0.04)'
  if (val >= -0.4) return 'rgba(239, 68, 68, 0.18)'
  return 'rgba(239, 68, 68, 0.4)'
}

function Visualization() {
  const { activeDatasetId, setActiveDatasetId } = useDataset()
  const [loading, setLoading] = useState(true)
  const [noDataset, setNoDataset] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [histCol, setHistCol] = useState('')
  const [boxCol, setBoxCol] = useState('')
  const [scatterX, setScatterX] = useState('')
  const [scatterY, setScatterY] = useState('')

  useEffect(() => {
    let dsId = activeDatasetId

    const loadViz = (id) => {
      axios.get(`/api/datasets/${id}/visualization/`)
        .then(res => {
          setData(res.data)
          const nc = res.data.numeric_columns || []
          if (nc.length > 0) { setHistCol(nc[0]); setBoxCol(nc[0]) }
          if (nc.length >= 2) { setScatterX(nc[0]); setScatterY(nc[1]) }
          setLoading(false)
        })
        .catch((err) => {
          const msg = err.response?.data?.error || 'Failed to generate visualizations. The dataset file may be missing — please try re-uploading.'
          setError(msg)
          setLoading(false)
        })
    }

    if (dsId) {
      loadViz(dsId)
    } else {
      // No dataset pre-selected — fetch user's datasets and pick the latest
      axios.get('/api/datasets/')
        .then(res => {
          const datasets = res.data
          if (datasets && datasets.length > 0) {
            const latestId = datasets[0].id
            setActiveDatasetId(latestId)
            loadViz(latestId)
          } else {
            setNoDataset(true)
            setLoading(false)
          }
        })
        .catch(() => { setNoDataset(true); setLoading(false) })
    }
  }, [])

  if (loading) return <div className="viz-page"><div className="state-message"><div className="spinner"></div><div>Generating visualizations…</div></div></div>
  if (noDataset) return <div className="viz-page"><EmptyState skills={['Histogram', 'Box Plot', 'Scatter Plot', 'Correlation Heatmap', 'Bar & Pie Charts']} /></div>
  if (error) return (
    <div className="viz-page">
      <div className="state-message" style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '18px' }}>Visualization Failed</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6' }}>{error}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'var(--indigo)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit' }}>
          Retry
        </button>
      </div>
    </div>
  )
  if (!data) return null

  const { histogram, boxplot, scatter, correlation, bar, pie, numeric_columns, categorical_columns } = data
  const noData = <div className="viz-no-data">No suitable data available in your file.</div>

  // Histogram
  const hData = histogram?.data?.[histCol] || []
  const hMax = hData.length > 0 ? Math.max(...hData.map(d => d.count)) : 1
  const hW = 520, hH = 300, hPL = 50, hPR = 20, hPT = 20, hPB = 60
  const hPlotW = hW - hPL - hPR, hPlotH = hH - hPT - hPB
  const hGap = 5, hBarW = hData.length > 0 ? (hPlotW - hGap * (hData.length - 1)) / hData.length : hPlotW

  // Boxplot
  const bData = boxplot?.data?.[boxCol]


  // Correlation
  const corrLabels = correlation?.data?.labels || []
  const corrMatrix = correlation?.data?.matrix || []

  // Bar
  const barData = bar?.data || []
  const barMax = barData.length > 0 ? Math.max(...barData.map(d => d.value), 1) : 1

  // Pie
  const pieData = pie?.data || []

  return (
    <div className="viz-page">
      <div className="viz-header">
        <div><h1 className="viz-title">Data Visualization</h1><p className="viz-subtitle">Auto-generated charts from your dataset</p></div>
      </div>

      <div className="viz-grid">
        {/* Histogram */}
        <div className="viz-card">
          <div className="card-header">
            <div><h2 className="card-title">Histogram</h2><p className="card-subtitle">Frequency distribution</p></div>
            {histogram?.supported && <select className="viz-select" value={histCol} onChange={e => setHistCol(e.target.value)}>{(histogram.columns||[]).map(c => <option key={c} value={c}>{c}</option>)}</select>}
          </div>
          {histogram?.supported && hData.length > 0 ? (
            <div className="viz-chart-wrapper">
              <svg viewBox={`0 0 ${hW} ${hH}`} className="viz-svg" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(pct => <line key={pct} x1={hPL} y1={hPT + hPlotH * (1-pct)} x2={hW-hPR} y2={hPT + hPlotH * (1-pct)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4"/>)}
                <line x1={hPL} y1={hPT+hPlotH} x2={hW-hPR} y2={hPT+hPlotH} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                <line x1={hPL} y1={hPT} x2={hPL} y2={hPT+hPlotH} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                {hData.map((d, i) => {
                  const bH = (d.count / hMax) * hPlotH
                  const x = hPL + i * (hBarW + hGap)
                  return (
                    <g key={i}>
                      <defs><linearGradient id={`hg-v-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.85"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0.4"/></linearGradient></defs>
                      <rect x={x} y={hPT+hPlotH-bH} width={hBarW} height={bH} rx="3" fill={`url(#hg-v-${i})`} className="bar-rect"/>
                      <text x={x+hBarW/2} y={hPT+hPlotH-bH-6} fill="var(--text-secondary)" fontSize="11" textAnchor="middle" fontWeight="600">{d.count}</text>
                      <text x={x+hBarW/2+3} y={hPT+hPlotH+16} fill="var(--text-muted)" fontSize="9" textAnchor="end" transform={`rotate(-35, ${x+hBarW/2+3}, ${hPT+hPlotH+16})`}>{d.range}</text>
                    </g>
                  )
                })}
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                  <text key={`yl-${pct}`} x={hPL - 6} y={hPT + hPlotH * (1 - pct) + 4} fill="var(--text-dim)" fontSize="9" textAnchor="end">{Math.round(hMax * pct)}</text>
                ))}
              </svg>
            </div>
          ) : noData}
        </div>

        {/* Box Plot */}
        <div className="viz-card">
          <div className="card-header">
            <div><h2 className="card-title">Box Plot</h2><p className="card-subtitle">Statistical distribution</p></div>
            {boxplot?.supported && <select className="viz-select" value={boxCol} onChange={e => setBoxCol(e.target.value)}>{(boxplot.columns||[]).map(c => <option key={c} value={c}>{c}</option>)}</select>}
          </div>
          {boxplot?.supported && bData ? (
            <div className="viz-chart-wrapper">
              <svg viewBox="0 0 400 280" className="viz-svg" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const range = bData.max - bData.min || 1
                  const yScale = v => 30 + (1 - (v - bData.min) / range) * 200
                  const cx = 170
                  return (
                    <g>
                      {/* Whisker lines */}
                      <line x1={cx-40} y1={yScale(bData.min)} x2={cx+40} y2={yScale(bData.min)} stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                      <line x1={cx} y1={yScale(bData.min)} x2={cx} y2={yScale(bData.q1)} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4"/>
                      {/* Box */}
                      <rect x={cx-50} y={yScale(bData.q3)} width="100" height={yScale(bData.q1) - yScale(bData.q3)} rx="6" fill="rgba(99,102,241,0.25)" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5"/>
                      {/* Median */}
                      <line x1={cx-50} y1={yScale(bData.median)} x2={cx+50} y2={yScale(bData.median)} stroke="#818cf8" strokeWidth="2.5"/>
                      {/* Upper whisker */}
                      <line x1={cx} y1={yScale(bData.q3)} x2={cx} y2={yScale(bData.max)} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4"/>
                      <line x1={cx-40} y1={yScale(bData.max)} x2={cx+40} y2={yScale(bData.max)} stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                      {/* Labels */}
                      <text x={cx+65} y={yScale(bData.max)+5} fill="var(--text-muted)" fontSize="11">Max: {bData.max}</text>
                      <text x={cx+65} y={yScale(bData.q3)+5} fill="var(--text-muted)" fontSize="11">Q3: {bData.q3}</text>
                      <text x={cx+65} y={yScale(bData.median)+5} fill="#818cf8" fontSize="11" fontWeight="600">Med: {bData.median}</text>
                      <text x={cx+65} y={yScale(bData.q1)+5} fill="var(--text-muted)" fontSize="11">Q1: {bData.q1}</text>
                      <text x={cx+65} y={yScale(bData.min)+5} fill="var(--text-muted)" fontSize="11">Min: {bData.min}</text>
                      {/* Outlier dots */}
                      {(bData.outliers || []).map((v, i) => <circle key={i} cx={cx - 25 + Math.random()*50} cy={yScale(v)} r="4" fill="#f43f5e" opacity="0.6"/>)}
                    </g>
                  )
                })()}
              </svg>
            </div>
          ) : noData}
        </div>

        {/* Scatter Plot */}
        <div className="viz-card">
          <div className="card-header">
            <div><h2 className="card-title">Scatter Plot</h2><p className="card-subtitle">{scatterX} vs {scatterY}</p></div>
            {scatter?.supported && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select className="viz-select" value={scatterX} onChange={e => setScatterX(e.target.value)}>
                  {(scatter.columns || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>vs</span>
                <select className="viz-select" value={scatterY} onChange={e => setScatterY(e.target.value)}>
                  {(scatter.columns || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
          {scatter?.supported && scatterX && scatterY && scatter.data?.[scatterX] && scatter.data?.[scatterY] ? (() => {
            const xVals = scatter.data[scatterX]
            const yVals = scatter.data[scatterY]
            const len = Math.min(xVals.length, yVals.length)
            const pts = []
            for (let i = 0; i < len; i++) {
              if (xVals[i] != null && yVals[i] != null) pts.push({ x: xVals[i], y: yVals[i] })
            }
            if (pts.length === 0) return noData

            const allX = pts.map(p => p.x), allY = pts.map(p => p.y)
            const minX = Math.min(...allX), maxX = Math.max(...allX)
            const minY = Math.min(...allY), maxY = Math.max(...allY)
            const padX = (maxX - minX) * 0.08 || 0.5, padY = (maxY - minY) * 0.08 || 0.5
            const rangeX = (maxX + padX) - (minX - padX) || 1, rangeY = (maxY + padY) - (minY - padY) || 1
            const adjMinX = minX - padX, adjMinY = minY - padY

            return (
              <div className="viz-chart-wrapper">
                <svg viewBox="0 0 520 340" className="viz-svg" preserveAspectRatio="xMidYMid meet">
                  <line x1="55" y1="300" x2="500" y2="300" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  <line x1="55" y1="20" x2="55" y2="300" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                  {[0.25, 0.5, 0.75].map(pct => (
                    <line key={pct} x1="55" y1={300 - pct * 280} x2="500" y2={300 - pct * 280} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4"/>
                  ))}
                  {pts.map((p, i) => {
                    const cx = 55 + ((p.x - adjMinX) / rangeX) * 445
                    const cy = 300 - ((p.y - adjMinY) / rangeY) * 275
                    return <circle key={i} cx={cx} cy={cy} r="5" fill="rgba(99,102,241,0.65)" stroke="rgba(99,102,241,0.3)" strokeWidth="1" className="scatter-dot"/>
                  })}
                  <text x="275" y="330" fill="var(--text-muted)" fontSize="12" textAnchor="middle">{scatterX}</text>
                  <text x="16" y="165" fill="var(--text-muted)" fontSize="12" textAnchor="middle" transform="rotate(-90, 16, 165)">{scatterY}</text>
                </svg>
              </div>
            )
          })() : noData}
        </div>

        {/* Correlation Heatmap */}
        <div className="viz-card viz-card-wide">
          <div className="card-header"><div><h2 className="card-title">Correlation Heatmap</h2><p className="card-subtitle">Pairwise correlations</p></div></div>
          {correlation?.supported && corrLabels.length > 0 ? (
            <div className="heatmap-wrap">
              <div className="heatmap-grid" style={{
                gridTemplateColumns: `80px repeat(${corrLabels.length}, minmax(52px, 1fr))`,
                gridTemplateRows: `32px repeat(${corrLabels.length}, minmax(40px, 1fr))`
              }}>
                <div></div>
                {corrLabels.map(l => <div key={`h-${l}`} className="heatmap-label heatmap-col-label">{l}</div>)}
                {corrMatrix.map((row, i) => (
                  <div key={`row-${i}`} style={{ display: 'contents' }}>
                    <div className="heatmap-label heatmap-row-label">{corrLabels[i]}</div>
                    {row.map((val, j) => <div key={`${i}-${j}`} className="heatmap-cell" style={{ background: corrColor(val) }} title={`${corrLabels[i]} × ${corrLabels[j]}: ${val.toFixed(2)}`}>{val.toFixed(2)}</div>)}
                  </div>
                ))}
              </div>
            </div>
          ) : noData}
        </div>

        {/* Bar Chart */}
        <div className="viz-card">
          <div className="card-header"><div><h2 className="card-title">Bar Chart</h2><p className="card-subtitle">{bar?.axes?.value || 'Value'} by {bar?.axes?.category || 'Category'}</p></div></div>
          {bar?.supported && barData.length > 0 ? (
            <div className="viz-chart-wrapper">
              <svg viewBox="0 0 520 300" className="viz-svg" preserveAspectRatio="xMidYMid meet">
                <line x1="50" y1="250" x2="500" y2="250" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
                <line x1="50" y1="20" x2="50" y2="250" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                {[0.25, 0.5, 0.75, 1].map(pct => (
                  <g key={pct}>
                    <line x1="50" y1={250 - pct * 230} x2="500" y2={250 - pct * 230} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4"/>
                    <text x="44" y={250 - pct * 230 + 4} fill="var(--text-dim)" fontSize="9" textAnchor="end">{Math.round(barMax * pct)}</text>
                  </g>
                ))}
                {barData.map((d, i) => {
                  const bW2 = Math.min((440 - 8 * barData.length) / barData.length, 50)
                  const bH2 = (d.value / barMax) * 220
                  const x = 55 + i * (bW2 + 8)
                  return (
                    <g key={i}>
                      <defs><linearGradient id={`bg-v-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.85"/><stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.45"/></linearGradient></defs>
                      <rect x={x} y={250 - bH2} width={bW2} height={bH2} rx="4" fill={`url(#bg-v-${i})`} className="bar-rect"/>
                      <text x={x + bW2/2} y={250 - bH2 - 6} fill="var(--text-secondary)" fontSize="10" textAnchor="middle" fontWeight="600">{d.value}</text>
                      <text x={x + bW2/2} y={264} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{d.label.length > 10 ? d.label.substring(0,9)+'…' : d.label}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          ) : noData}
        </div>

        {/* Pie Chart */}
        <div className="viz-card">
          <div className="card-header"><div><h2 className="card-title">Pie Chart</h2><p className="card-subtitle">Distribution by {pie?.column || 'category'}</p></div></div>
          {pie?.supported && pieData.length > 0 ? (
            <div className="pie-container">
              <svg viewBox="0 0 260 260" className="pie-svg" preserveAspectRatio="xMidYMid meet">
                <circle cx="130" cy="130" r="95" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="28"/>
                {pieData.reduce((acc, seg, i) => {
                  const dashLen = seg.pct * 5.97
                  const gapLen = (100 - seg.pct) * 5.97
                  acc.elements.push(
                    <circle key={i} cx="130" cy="130" r="95" fill="none" stroke={COLORS[i % COLORS.length]}
                      strokeWidth="28" strokeDasharray={`${dashLen} ${gapLen}`}
                      strokeDashoffset={149 - acc.offset} strokeLinecap="round" className="pie-segment"/>
                  )
                  acc.offset = acc.offset + dashLen
                  return acc
                }, { elements: [], offset: 0 }).elements}
                <text x="130" y="124" textAnchor="middle" fill="var(--text-primary)" fontSize="26" fontWeight="800">{pieData[0]?.pct}%</text>
                <text x="130" y="145" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500">{pieData[0]?.label}</text>
              </svg>
              <div className="pie-legend">
                {pieData.map((s, i) => (
                  <div key={s.label} className="legend-item">
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }}></span>
                    <span className="legend-label">{s.label} ({s.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : noData}
        </div>
      </div>
    </div>
  )
}

export default Visualization
