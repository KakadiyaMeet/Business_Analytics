/**
 * Dataset-related API calls.
 */
import axios from "./axios";

export const uploadDataset = (formData, onUploadProgress) =>
  axios.post("/api/upload/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });

export const getDatasets = () => axios.get("/api/datasets/");

export const getDatasetPreview = (datasetId, rows = 10) =>
  axios.get(`/api/datasets/${datasetId}/preview/?rows=${rows}`);

export const getDashboardSummary = () => axios.get("/api/dashboard/");

export const getDatasetColumns = (datasetId) =>
  axios.get(`/api/datasets/${datasetId}/columns/`);
