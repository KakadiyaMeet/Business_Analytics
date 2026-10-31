# Database Schema

## Models

### Dataset
Stores uploaded CSV datasets and their metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| file | FileField | Uploaded CSV file (upload_to='datasets/') |
| original_filename | CharField(255) | Original file name |
| uploaded_at | DateTimeField | Auto-set on creation |
| total_rows | IntegerField | Row count |
| total_columns | IntegerField | Column count |
| numeric_columns_count | IntegerField | Numeric column count |
| categorical_columns_count | IntegerField | Categorical column count |
| missing_values_count | IntegerField | Total missing values |
| duplicate_rows_count | IntegerField | Duplicate row count |
| columns_json | JSONField | Per-column metadata |
| file_size | IntegerField | File size in bytes |
| memory_usage | FloatField | Memory usage in MB |

### PredictionRun
Stores prediction run history and results.

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| dataset | ForeignKey(Dataset) | Related dataset |
| model_type | CharField(50) | ML model identifier |
| target_column | CharField(255) | Target column name |
| features_json | JSONField | List of feature columns |
| split_pct | IntegerField | Train/test split percentage |
| r2_score | FloatField | R² score |
| mae | FloatField | Mean Absolute Error |
| mse | FloatField | Mean Squared Error |
| rmse | FloatField | Root Mean Squared Error |
| results_json | JSONField | Full results (scatter pts, metrics, etc.) |
| created_at | DateTimeField | Auto-set on creation |

### GeneratedReport
Stores generated report metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| dataset | ForeignKey(Dataset) | Related dataset |
| report_type | CharField(20) | 'eda', 'prediction', or 'summary' |
| file | FileField | Generated PDF file (upload_to='reports/') |
| created_at | DateTimeField | Auto-set on creation |
