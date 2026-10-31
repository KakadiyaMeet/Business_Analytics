import { useState } from 'react'
import './DataTable.css'

/**
 * Reusable data table with search, sort, pagination, and optional date filters.
 *
 * Props:
 *  - columns:    [{ key, label, sortable?, render? }]
 *  - data:       array of row objects
 *  - pagination: { page, page_size, total, total_pages }
 *  - onPageChange(page)
 *  - onSearch(searchStr)
 *  - onSort(sortKey)
 *  - onDateFilter({ date_from, date_to })
 *  - searchPlaceholder
 *  - actions:    (row) => JSX — renders action buttons per row
 *  - loading
 *  - emptyText
 *  - showDateFilter
 *  - sortBy — current sort key
 */
function DataTable({
  columns = [],
  data = [],
  pagination = {},
  onPageChange,
  onSearch,
  onSort,
  onDateFilter,
  searchPlaceholder = 'Search…',
  actions,
  loading = false,
  emptyText = 'No data found.',
  showDateFilter = false,
  sortBy = '',
}) {
  const [searchVal, setSearchVal] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const handleSearch = (e) => {
    const val = e.target.value
    setSearchVal(val)
    onSearch?.(val)
  }

  const handleDateApply = () => {
    onDateFilter?.({ date_from: dateFrom, date_to: dateTo })
  }

  const handleClearDate = () => {
    setDateFrom('')
    setDateTo('')
    onDateFilter?.({ date_from: '', date_to: '' })
  }

  const handleSort = (col) => {
    if (!col.sortable) return
    const nextSort = sortBy === col.key ? `-${col.key}` : sortBy === `-${col.key}` ? col.key : col.key
    onSort?.(nextSort)
  }

  const getSortIcon = (col) => {
    if (!col.sortable) return null
    if (sortBy === col.key) return '↑'
    if (sortBy === `-${col.key}`) return '↓'
    return '⇅'
  }

  const { page = 1, total_pages = 1, total = 0 } = pagination

  return (
    <div className="dt-wrapper">
      {/* Controls */}
      <div className="dt-controls">
        <div className="dt-search-wrap">
          <svg className="dt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="dt-search"
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
          />
        </div>

        {showDateFilter && (
          <div className="dt-date-filters">
            <input type="date" className="dt-date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="dt-date-sep">to</span>
            <input type="date" className="dt-date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button className="dt-date-btn apply" onClick={handleDateApply}>Apply</button>
            {(dateFrom || dateTo) && (
              <button className="dt-date-btn clear" onClick={handleClearDate}>Clear</button>
            )}
          </div>
        )}

        <span className="dt-total">{total} record{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="dt-table-scroll">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className={col.sortable ? 'sortable' : ''} onClick={() => handleSort(col)}>
                  <span>{col.label}</span>
                  {col.sortable && <span className="sort-indicator">{getSortIcon(col)}</span>}
                </th>
              ))}
              {actions && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="dt-loading">
                  <div className="spinner" style={{ width: 28, height: 28 }}></div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="dt-empty">{emptyText}</td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key]?.toString?.() ?? '—'}
                    </td>
                  ))}
                  {actions && <td className="dt-actions-cell">{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total_pages > 1 && (
        <div className="dt-pagination">
          <button
            className="dt-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            ← Prev
          </button>
          <div className="dt-page-numbers">
            {Array.from({ length: Math.min(total_pages, 7) }, (_, i) => {
              let pageNum
              if (total_pages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= total_pages - 3) {
                pageNum = total_pages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  className={`dt-page-num ${pageNum === page ? 'active' : ''}`}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            className="dt-page-btn"
            disabled={page >= total_pages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default DataTable
