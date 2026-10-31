"""
dashboard.services — Dashboard data aggregation logic.

Fetches dataset metadata from MongoDB instead of Django ORM.
"""

from config.mongodb import get_collection
from upload.services import serialize_dataset


def get_dashboard_data(user=None):
    """
    Return dashboard KPIs from the user's latest uploaded dataset.

    Args:
        user: MongoUser instance to filter datasets.

    Returns:
        Dict with has_data, kpis, latest_dataset, and datasets keys.
    """
    datasets_col = get_collection('datasets')

    query = {}
    if user:
        query['user_id'] = user.id

    # Get datasets sorted newest first
    cursor = datasets_col.find(query).sort('uploaded_at', -1)
    all_docs = list(cursor)

    if not all_docs:
        return {
            'has_data': False,
            'kpis': {},
            'latest_dataset': None,
            'datasets': [],
        }

    latest = all_docs[0]

    return {
        'has_data': True,
        'kpis': {
            'total_rows': latest.get('total_rows', 0),
            'total_columns': latest.get('total_columns', 0),
            'numeric_columns': latest.get('numeric_columns_count', 0),
            'categorical_columns': latest.get('categorical_columns_count', 0),
            'missing_values': latest.get('missing_values_count', 0),
            'duplicate_rows': latest.get('duplicate_rows_count', 0),
        },
        'latest_dataset': serialize_dataset(latest),
        'datasets': [serialize_dataset(d) for d in all_docs[:10]],
    }
