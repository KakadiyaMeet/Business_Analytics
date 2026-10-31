/**
 * Admin panel API calls.
 * All endpoints are prefixed with /api/admin-panel/.
 */
import axios from './axios'

const BASE = '/api/admin-panel'

// ── Dashboard ──
export const getAdminDashboard = () =>
  axios.get(`${BASE}/dashboard/`)

// ── User Management ──
export const getAdminUsers = (params = {}) =>
  axios.get(`${BASE}/users/`, { params })

export const getAdminUserDetail = (id) =>
  axios.get(`${BASE}/users/${id}/`)

export const updateAdminUser = (id, data) =>
  axios.put(`${BASE}/users/${id}/update/`, data)

export const activateUser = (id) =>
  axios.post(`${BASE}/users/${id}/activate/`)

export const deactivateUser = (id) =>
  axios.post(`${BASE}/users/${id}/deactivate/`)

export const deleteUser = (id) =>
  axios.delete(`${BASE}/users/${id}/delete/`)

// ── Dataset Management ──
export const getAdminDatasets = (params = {}) =>
  axios.get(`${BASE}/datasets/`, { params })

export const getAdminDatasetDetail = (id) =>
  axios.get(`${BASE}/datasets/${id}/`)

export const downloadDataset = (id) =>
  axios.get(`${BASE}/datasets/${id}/download/`)

export const deleteDataset = (id) =>
  axios.delete(`${BASE}/datasets/${id}/delete/`)

// ── Prediction Management ──
export const getAdminPredictions = (params = {}) =>
  axios.get(`${BASE}/predictions/`, { params })

export const getAdminPredictionDetail = (id) =>
  axios.get(`${BASE}/predictions/${id}/`)

export const deletePrediction = (id) =>
  axios.delete(`${BASE}/predictions/${id}/delete/`)

// ── Report Management ──
export const getAdminReports = (params = {}) =>
  axios.get(`${BASE}/reports/`, { params })

export const downloadReport = (id) =>
  axios.get(`${BASE}/reports/${id}/download/`)

export const deleteReport = (id) =>
  axios.delete(`${BASE}/reports/${id}/delete/`)

// ── Activity Logs ──
export const getAdminActivityLogs = (params = {}) =>
  axios.get(`${BASE}/activity-logs/`, { params })

// ── Analytics ──
export const getAdminAnalytics = () =>
  axios.get(`${BASE}/analytics/`)

// ── Admin Profile ──
export const getAdminProfile = () =>
  axios.get(`${BASE}/profile/`)

export const updateProfile = (data) =>
  axios.put('/api/auth/profile/', data)

export const changePassword = (data) =>
  axios.post('/api/auth/change-password/', data)
