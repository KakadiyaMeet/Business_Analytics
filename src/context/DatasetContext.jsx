/**
 * DatasetContext — Share activeDatasetId across pages without localStorage.
 */
import { createContext, useContext, useState, useCallback } from 'react'

const DatasetContext = createContext(null)

export function DatasetProvider({ children, initialDatasetId = null }) {
  const [activeDatasetId, setActiveDatasetId] = useState(initialDatasetId)

  const selectDataset = useCallback((id) => {
    setActiveDatasetId(id)
  }, [])

  return (
    <DatasetContext.Provider value={{ activeDatasetId, setActiveDatasetId: selectDataset }}>
      {children}
    </DatasetContext.Provider>
  )
}

export function useDataset() {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider')
  return ctx
}
