"""
eda.services — Exploratory Data Analysis logic.

Extracted from services/eda_service.py.
"""

import math
import numpy as np
import pandas as pd
from django.utils import timezone
from upload.utils import load_dataframe
from config.mongodb import get_collection, get_next_id


def _sanitize(obj):
    """Recursively replace NaN/Inf floats with None for JSON safety."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


def perform_eda(dataset, user=None):
    """
    Comprehensive EDA:
    - Shape, Data Types, Summary Statistics
    - Missing Values Analysis, Duplicate Analysis
    - Correlation Matrix, Outlier Detection, Histograms

    Args:
        dataset: MongoDB dataset document (dict).
        user: Optional MongoUser instance (for storing history).

    Returns:
        Dict with all EDA results.
    """
    df = load_dataframe(dataset)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # -- Shape --
    shape = {'rows': len(df), 'columns': len(df.columns)}

    # -- Data Types --
    data_types = []
    for col in df.columns:
        data_types.append({
            'column': col,
            'dtype': str(df[col].dtype),
            'non_null': int(df[col].notna().sum()),
            'null': int(df[col].isnull().sum()),
            'unique': int(df[col].nunique()),
        })

    # -- Summary Statistics (describe) --
    summary_stats = []
    if numeric_cols:
        desc = df[numeric_cols].describe().round(2)
        for col in numeric_cols:
            stats = {}
            for stat_name in desc.index:
                val = desc.loc[stat_name, col]
                stats[stat_name] = float(val) if pd.notna(val) else None
            stats['name'] = col
            stats['dtype'] = str(df[col].dtype)
            summary_stats.append(stats)

    # -- Missing Values Analysis --
    missing_data = []
    total_missing = 0
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        pct = round(null_count / len(df) * 100, 1) if len(df) > 0 else 0
        total_missing += null_count
        level = 'none'
        if pct > 10:
            level = 'high'
        elif pct > 5:
            level = 'med'
        elif pct > 0:
            level = 'low'
        missing_data.append({
            'col': col,
            'pct': pct,
            'level': level,
            'count': null_count,
        })

    # -- Duplicate Analysis --
    duplicate_count = int(df.duplicated().sum())
    duplicate_pct = round(duplicate_count / len(df) * 100, 1) if len(df) > 0 else 0
    duplicate_analysis = {
        'count': duplicate_count,
        'percentage': duplicate_pct,
        'total_rows': len(df),
    }

    # -- Correlation Matrix --
    corr_data = {}
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr().fillna(0)
        corr_data = {
            'labels': numeric_cols,
            'matrix': corr_matrix.round(2).values.tolist(),
        }

    # -- Outlier Detection (IQR method) --
    outliers = []
    if numeric_cols:
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) < 4:
                continue
            Q1 = float(series.quantile(0.25))
            Q3 = float(series.quantile(0.75))
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outlier_count = int(((series < lower) | (series > upper)).sum())
            outlier_pct = round(outlier_count / len(series) * 100, 1)
            outliers.append({
                'column': col,
                'count': outlier_count,
                'percentage': outlier_pct,
                'lower_bound': round(lower, 2),
                'upper_bound': round(upper, 2),
                'Q1': round(Q1, 2),
                'Q3': round(Q3, 2),
                'IQR': round(IQR, 2),
            })

    # -- Histograms --
    histograms = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 0:
            counts, bin_edges = np.histogram(series, bins=min(8, max(3, len(series) // 10)))
            bins_data = []
            for i in range(len(counts)):
                low = round(float(bin_edges[i]), 1)
                high = round(float(bin_edges[i + 1]), 1)
                bins_data.append({
                    'range': f"{low}-{high}",
                    'count': int(counts[i]),
                })
            histograms[col] = bins_data

    result = {
        'shape': shape,
        'data_types': data_types,
        'summary_stats': summary_stats,
        'missing_data': missing_data,
        'total_missing': total_missing,
        'duplicate_analysis': duplicate_analysis,
        'correlation': corr_data,
        'outliers': outliers,
        'histograms': histograms,
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols,
        'all_columns': list(df.columns),
    }

    # Store EDA results in MongoDB for history/reuse
    try:
        dataset_id = dataset.get('id') if isinstance(dataset, dict) else getattr(dataset, 'id', None)
        eda_doc = {
            'id': get_next_id('eda_history'),
            'user_id': user.id if user else None,
            'dataset_id': dataset_id,
            'results': result,
            'created_at': timezone.now(),
        }
        get_collection('eda_history').insert_one(eda_doc)
    except Exception:
        pass  # Don't fail EDA if history storage fails

    return _sanitize(result)
