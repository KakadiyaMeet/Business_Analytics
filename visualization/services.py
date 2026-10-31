"""
visualization.services — Chart-ready data generation.

Extracted from services/visualization_service.py.
"""

import math
import numpy as np
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

def get_chart_data(dataset, user=None):
    """
    Return chart-ready data for: Histogram, Box Plot, Scatter Plot,
    Correlation Heatmap, Bar Chart, Pie Chart.

    Args:
        dataset: MongoDB dataset document (dict).
        user: Optional MongoUser instance (for storing history).

    Returns:
        Dict with visualization data for each chart type.
    """
    df = load_dataframe(dataset)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # -- Histogram Data (for all numeric columns) --
    histogram_data = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 0:
            counts, bin_edges = np.histogram(series, bins=min(12, max(4, len(series) // 10)))
            bins = []
            for i in range(len(counts)):
                bins.append({
                    'range': f"{round(float(bin_edges[i]),1)}-{round(float(bin_edges[i+1]),1)}",
                    'count': int(counts[i]),
                })
            histogram_data[col] = bins

    # -- Box Plot Data --
    boxplot_data = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) >= 4:
            q1 = float(series.quantile(0.25))
            q2 = float(series.quantile(0.5))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            whisker_low = float(series[series >= q1 - 1.5 * iqr].min())
            whisker_high = float(series[series <= q3 + 1.5 * iqr].max())
            outliers_low = series[series < q1 - 1.5 * iqr].tolist()[:10]
            outliers_high = series[series > q3 + 1.5 * iqr].tolist()[:10]
            boxplot_data[col] = {
                'min': round(whisker_low, 2),
                'q1': round(q1, 2),
                'median': round(q2, 2),
                'q3': round(q3, 2),
                'max': round(whisker_high, 2),
                'outliers': [round(float(v), 2) for v in outliers_low + outliers_high],
            }

    # -- Scatter Plot Data --
    scatter_data = {}
    if len(numeric_cols) >= 2:
        sample = df[numeric_cols].dropna().head(500)
        scatter_data = {
            col: [round(float(v), 2) for v in sample[col].tolist()]
            for col in numeric_cols
        }

    # -- Correlation Heatmap --
    corr_data = {}
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr().fillna(0)
        corr_data = {
            'labels': numeric_cols,
            'matrix': corr_matrix.round(2).values.tolist(),
        }

    # -- Bar Chart Data --
    bar_data = []
    bar_axes = {'category': '', 'value': ''}
    if numeric_cols and categorical_cols:
        cat_col = categorical_cols[0]
        num_col = numeric_cols[0]
        grouped = df.groupby(cat_col)[num_col].sum().head(10)
        for label, val in grouped.items():
            bar_data.append({'label': str(label), 'value': round(float(val), 2)})
        bar_axes = {'category': cat_col, 'value': num_col}
    elif numeric_cols:
        col = numeric_cols[0]
        chunk_size = max(1, len(df) // 10)
        for i in range(0, min(len(df), chunk_size * 10), chunk_size):
            chunk = df[col].iloc[i:i + chunk_size]
            bar_data.append({'label': f'Rows {i+1}-{i+len(chunk)}', 'value': round(float(chunk.sum()), 2)})
        bar_axes = {'category': 'Row Group', 'value': col}

    # -- Pie Chart Data --
    pie_data = []
    if categorical_cols:
        cat_col = categorical_cols[0]
        counts = df[cat_col].value_counts().head(6)
        total = counts.sum()
        for label, count in counts.items():
            pie_data.append({
                'label': str(label),
                'value': int(count),
                'pct': round(float(count / total * 100), 1),
            })

    result = {
        'histogram': {
            'supported': len(histogram_data) > 0,
            'data': histogram_data,
            'columns': numeric_cols,
        },
        'boxplot': {
            'supported': len(boxplot_data) > 0,
            'data': boxplot_data,
            'columns': list(boxplot_data.keys()),
        },
        'scatter': {
            'supported': len(scatter_data) > 0,
            'data': scatter_data,
            'columns': numeric_cols,
        },
        'correlation': {
            'supported': len(corr_data) > 0,
            'data': corr_data,
        },
        'bar': {
            'supported': len(bar_data) > 0,
            'data': bar_data,
            'axes': bar_axes,
        },
        'pie': {
            'supported': len(pie_data) > 0,
            'data': pie_data,
            'column': categorical_cols[0] if categorical_cols else '',
        },
        'numeric_columns': numeric_cols,
        'categorical_columns': categorical_cols,
    }

    # Store visualization metadata in MongoDB for history
    try:
        dataset_id = dataset.get('id') if isinstance(dataset, dict) else getattr(dataset, 'id', None)
        chart_types = [k for k, v in result.items() if isinstance(v, dict) and v.get('supported')]
        viz_doc = {
            'id': get_next_id('visualization_history'),
            'user_id': user.id if user else None,
            'dataset_id': dataset_id,
            'chart_types': chart_types,
            'created_at': timezone.now(),
        }
        get_collection('visualization_history').insert_one(viz_doc)
    except Exception:
        pass  # Don't fail visualization if history storage fails

    return _sanitize(result)
