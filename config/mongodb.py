"""
config/mongodb.py — MongoDB connection singleton and helpers.

Provides a reusable MongoDB client, database accessor, collection accessor,
and an auto-incrementing integer ID generator (to preserve int-based API contracts).
"""

from pymongo import MongoClient, ReturnDocument, ASCENDING
from django.conf import settings

_client = None
_db = None


def get_client():
    """Return the singleton MongoClient instance."""
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
    return _client


def get_db():
    """Return the application MongoDB database."""
    global _db
    if _db is None:
        _db = get_client()[settings.MONGO_DB_NAME]
    return _db


def get_collection(name):
    """Return a MongoDB collection by name."""
    return get_db()[name]


def get_next_id(collection_name):
    """
    Return the next auto-incrementing integer ID for a collection.

    Uses a 'counters' collection to track sequences, ensuring
    the same integer-based ID scheme the frontend already expects.
    """
    db = get_db()
    result = db.counters.find_one_and_update(
        {'_id': collection_name},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return result['seq']


def ensure_indexes():
    """
    Create MongoDB indexes for optimal query performance.
    Safe to call multiple times. Handles pre-existing conflicting indexes
    by dropping and recreating them.
    """
    db = get_db()

    def safe_index(collection, keys, **kwargs):
        """Create an index, dropping conflicting ones if needed."""
        try:
            collection.create_index(keys, **kwargs)
        except Exception:
            # Drop the conflicting index and retry
            try:
                if isinstance(keys, str):
                    idx_name = f'{keys}_1'
                elif isinstance(keys, list):
                    parts = []
                    for k, v in keys:
                        parts.append(f'{k}_{v}')
                    idx_name = '_'.join(parts)
                else:
                    return
                collection.drop_index(idx_name)
                collection.create_index(keys, **kwargs)
            except Exception:
                pass  # Index creation is best-effort

    # Users
    safe_index(db.users, 'id', unique=True)
    safe_index(db.users, 'username', unique=True)
    safe_index(db.users, 'email')
    safe_index(db.users, 'date_joined')

    # Datasets
    safe_index(db.datasets, 'id', unique=True)
    safe_index(db.datasets, 'user_id')
    safe_index(db.datasets, [('uploaded_at', -1)])

    # Predictions
    safe_index(db.predictions, 'id', unique=True)
    safe_index(db.predictions, 'user_id')
    safe_index(db.predictions, 'dataset_id')
    safe_index(db.predictions, [('created_at', -1)])

    # Reports
    safe_index(db.reports, 'id', unique=True)
    safe_index(db.reports, 'user_id')
    safe_index(db.reports, 'dataset_id')
    safe_index(db.reports, [('created_at', -1)])

    # Activity Logs
    safe_index(db.activity_logs, 'user_id')
    safe_index(db.activity_logs, 'action')
    safe_index(db.activity_logs, [('created_at', -1)])

    # EDA History
    safe_index(db.eda_history, 'id', unique=True)
    safe_index(db.eda_history, 'user_id')
    safe_index(db.eda_history, 'dataset_id')
    safe_index(db.eda_history, [('created_at', -1)])

    # Visualization History
    safe_index(db.visualization_history, 'id', unique=True)
    safe_index(db.visualization_history, 'user_id')
    safe_index(db.visualization_history, 'dataset_id')
    safe_index(db.visualization_history, [('created_at', -1)])

