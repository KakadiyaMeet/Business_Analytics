"""
upload.services — Dataset upload, listing, and preview logic.

All persistence uses MongoDB instead of Django ORM.
Pandas continues to process CSV files exactly as before.
"""

import os
import uuid
import numpy as np
import pandas as pd
from django.conf import settings
from django.utils import timezone

from config.mongodb import get_collection, get_next_id
from .utils import load_dataframe


def serialize_dataset(doc):
    """
    Convert a MongoDB dataset document to a JSON-serializable dict.

    Matches the exact field set the frontend expects from DatasetSerializer.
    """
    if doc is None:
        return None
    return {
        'id': doc.get('id'),
        'original_filename': doc.get('original_filename', ''),
        'uploaded_at': doc.get('uploaded_at', '').isoformat() if hasattr(doc.get('uploaded_at', ''), 'isoformat') else str(doc.get('uploaded_at', '')),
        'total_rows': doc.get('total_rows', 0),
        'total_columns': doc.get('total_columns', 0),
        'numeric_columns_count': doc.get('numeric_columns_count', 0),
        'categorical_columns_count': doc.get('categorical_columns_count', 0),
        'missing_values_count': doc.get('missing_values_count', 0),
        'duplicate_rows_count': doc.get('duplicate_rows_count', 0),
        'columns_json': doc.get('columns_json', {}),
        'file_size': doc.get('file_size', 0),
        'memory_usage': doc.get('memory_usage', 0),
    }


def process_csv_upload(csv_file, user=None):
    """
    Parse and store an uploaded CSV file.

    Args:
        csv_file: Django UploadedFile object.
        user: MongoUser instance (owner of the dataset).

    Returns:
        Tuple of (response_data_dict, error_message).
        error_message is None on success.
    """
    if not csv_file:
        return None, 'No file provided.'

    if not csv_file.name.lower().endswith('.csv'):
        return None, 'Only CSV files are supported.'

    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        return None, f'Failed to parse CSV: {str(e)}'

    if df.empty:
        return None, 'The CSV file is empty.'

    # Compute metadata
    missing_count = int(df.isnull().sum().sum())
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    duplicate_count = int(df.duplicated().sum())

    # Per-column missing info
    missing_per_col = {}
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        if null_count > 0:
            missing_per_col[col] = {
                'count': null_count,
                'percentage': round(null_count / len(df) * 100, 2),
            }

    # Build column info
    columns_info = {}
    for col in df.columns:
        columns_info[col] = {
            'dtype': str(df[col].dtype),
            'is_numeric': col in numeric_cols,
        }

    # Memory usage in MB
    memory_mb = round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)

    # Save CSV file to disk with a unique name to prevent overwrites
    datasets_dir = os.path.join(settings.MEDIA_ROOT, 'datasets')
    os.makedirs(datasets_dir, exist_ok=True)

    cleaned_csv = df.to_csv(index=False)
    unique_filename = csv_file.name
    full_path = os.path.join(datasets_dir, unique_filename)
    # If a file with the same name already exists, prepend a short UUID
    if os.path.exists(full_path):
        name, ext = os.path.splitext(csv_file.name)
        unique_filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
        full_path = os.path.join(datasets_dir, unique_filename)
    file_path = os.path.join('datasets', unique_filename)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(cleaned_csv)

    # Insert into MongoDB
    dataset_id = get_next_id('datasets')
    now = timezone.now()

    doc = {
        'id': dataset_id,
        'user_id': user.id if user else None,
        'file_path': file_path,
        'original_filename': csv_file.name,
        'uploaded_at': now,
        'total_rows': len(df),
        'total_columns': len(df.columns),
        'numeric_columns_count': len(numeric_cols),
        'categorical_columns_count': len(categorical_cols),
        'missing_values_count': missing_count,
        'duplicate_rows_count': duplicate_count,
        'columns_json': columns_info,
        'file_size': csv_file.size,
        'memory_usage': memory_mb,
    }
    get_collection('datasets').insert_one(doc)

    # Build preview (first 10 rows)
    preview_rows = df.head(10).replace({np.nan: None}).to_dict(orient='records')

    data = {
        'dataset': serialize_dataset(doc),
        'preview': preview_rows,
        'columns': list(df.columns),
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols,
        'missing_per_col': missing_per_col,
    }
    return data, None


def list_datasets(user=None):
    """Return all datasets for the given user, newest first."""
    datasets = get_collection('datasets')
    query = {}
    if user:
        query['user_id'] = user.id

    docs = datasets.find(query).sort('uploaded_at', -1)
    return [serialize_dataset(doc) for doc in docs]


def get_dataset_by_id(dataset_id, user=None):
    """
    Fetch a single dataset document from MongoDB.

    Args:
        dataset_id: Integer ID.
        user: If provided, also filter by user ownership.

    Returns:
        Dict (MongoDB document) or None.
    """
    query = {'id': int(dataset_id)}
    if user:
        query['user_id'] = user.id
    return get_collection('datasets').find_one(query)


def get_preview(dataset_doc, num_rows=10):
    """
    Return preview data for a dataset.

    Args:
        dataset_doc: MongoDB document dict.
        num_rows: Number of rows to preview.

    Returns:
        Dict with dataset info and preview rows.
    """
    df = load_dataframe(dataset_doc)
    preview = df.head(num_rows).replace({np.nan: None}).to_dict(orient='records')

    return {
        'dataset': serialize_dataset(dataset_doc),
        'preview': preview,
        'columns': list(df.columns),
        'total_rows': len(df),
    }
