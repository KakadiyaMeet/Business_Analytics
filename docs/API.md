# API Documentation

## Base URL

```
http://localhost:8000/api/
```

## Authentication

### POST `/api/auth/login/`
Authenticate user and create session.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

### POST `/api/auth/register/`
Create a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

### POST `/api/auth/logout/`
Destroy user session.

### GET `/api/auth/user/`
Return current authenticated user info.

---

## Dashboard

### GET `/api/dashboard/`
Return dashboard KPIs from the latest uploaded dataset.

---

## Datasets

### POST `/api/upload/`
Upload a CSV file.

### GET `/api/datasets/`
List all uploaded datasets.

### GET `/api/datasets/{id}/preview/`
Return first N rows of a dataset. Query param: `rows` (default: 10).

### GET `/api/datasets/{id}/columns/`
Return all columns with types.

---

## EDA

### GET `/api/datasets/{id}/eda/`
Comprehensive exploratory data analysis.

---

## Visualization

### GET `/api/datasets/{id}/visualization/`
Chart-ready data for histograms, box plots, scatter, correlation, bar, pie.

---

## Prediction

### POST `/api/datasets/{id}/predict/`
Train a user-selected ML model.

**Request Body:**
```json
{
  "target_column": "string",
  "feature_columns": ["string"],
  "cleaning_method": "mean|median|mode|drop",
  "split_pct": 80,
  "model_type": "linear_regression|multiple_linear_regression|polynomial_regression|knn|svm|decision_tree|random_forest",
  "model_params": {}
}
```

### GET `/api/datasets/{id}/predictions/`
Prediction history for a dataset.

---

## Reports

### POST `/api/datasets/{id}/report/`
Generate a PDF report.

**Request Body:**
```json
{
  "report_type": "eda|prediction|summary"
}
```

### GET `/api/datasets/{id}/reports/`
List all generated reports for a dataset.
