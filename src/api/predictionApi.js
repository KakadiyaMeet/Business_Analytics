/**
 * Prediction-related API calls.
 */
import axios from './axios'

export const runPrediction = (datasetId, data) =>
  axios.post(`/api/datasets/${datasetId}/predict/`, data)

export const getPredictionHistory = (datasetId) =>
  axios.get(`/api/datasets/${datasetId}/predictions/`)
