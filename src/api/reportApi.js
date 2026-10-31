/**
 * Report-related API calls.
 */
import axios from './axios'

export const generateReport = (datasetId, reportType) =>
  axios.post(`/api/datasets/${datasetId}/report/`, { report_type: reportType })

export const getReports = (datasetId) =>
  axios.get(`/api/datasets/${datasetId}/reports/`)
