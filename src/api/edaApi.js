/**
 * EDA (Exploratory Data Analysis) API calls.
 */
import axios from './axios'

export const getEDAData = (datasetId) =>
  axios.get(`/api/datasets/${datasetId}/eda/`)
