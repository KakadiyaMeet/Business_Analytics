"""
activity.services — Helper to record user activities in MongoDB.

Usage:
    from activity.services import log_activity
    log_activity(request.user, 'upload', {'filename': 'data.csv'}, request)
"""

from django.utils import timezone
from config.mongodb import get_collection, get_next_id


def get_client_ip(request):
    """Extract client IP address from the request."""
    if request is None:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_activity(user, action, details=None, request=None):
    """
    Create an activity log entry in MongoDB.

    Args:
        user: MongoUser instance (or any object with .id and .is_authenticated).
        action: One of the action keys (e.g. 'login', 'upload', 'prediction').
        details: Optional dict with extra info.
        request: Optional Django request for IP extraction.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return None

    doc = {
        'id': get_next_id('activity_logs'),
        'user_id': user.id,
        'action': action,
        'details': details or {},
        'ip_address': get_client_ip(request),
        'created_at': timezone.now(),
    }
    get_collection('activity_logs').insert_one(doc)
    return doc
