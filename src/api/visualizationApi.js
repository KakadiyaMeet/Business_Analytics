/**
 * Visualization API calls.
 */
import axios from './axios'

export const getVisualizationData = (datasetId) =>
  axios.get(`/api/datasets/${datasetId}/visualization/`)
