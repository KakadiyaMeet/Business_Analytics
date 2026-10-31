"""
adminpanel.views — Admin panel API views.

All views require admin permission (is_staff=True).
All data comes from MongoDB instead of Django ORM.
"""

import os
import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAdminUser
from config.mongodb import get_collection
from config.mongo_user import get_user_by_id, MongoUser
from activity.services import log_activity

from upload.services import serialize_dataset
from prediction.services import serialize_prediction
from reports.services import serialize_report


# ===============================================
# HELPER: Pagination for MongoDB cursors
# ===============================================

def paginate_mongo(collection_name, query, sort_field, sort_dir, request, default_page_size=20):
    """
    Paginate a MongoDB query.

    Returns (list_of_docs, meta_dict).
    """
    col = get_collection(collection_name)

    try:
        page = int(request.query_params.get('page', 1))
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = int(request.query_params.get('page_size', default_page_size))
    except (ValueError, TypeError):
        page_size = default_page_size

    page_size = min(max(page_size, 1), 100)
    total = col.count_documents(query)
    total_pages = max((total + page_size - 1) // page_size, 1)
    page = min(max(page, 1), total_pages)
    skip = (page - 1) * page_size

    docs = list(
        col.find(query)
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(page_size)
    )

    meta = {
        'page': page,
        'page_size': page_size,
        'total': total,
        'total_pages': total_pages,
    }
    return docs, meta


def _user_summary(user_id):
    """Build a small user info dict from a user_id."""
    if user_id is None:
        return None
    user = get_user_by_id(user_id)
    if not user:
        return None
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
    }


def _serialize_admin_user(doc):
    """Serialize a user MongoDB doc for admin views."""
    users_col = get_collection('users')
    user_id = doc.get('id')

    datasets_count = get_collection('datasets').count_documents({'user_id': user_id})
    predictions_count = get_collection('predictions').count_documents({'user_id': user_id})
    reports_count = get_collection('reports').count_documents({'user_id': user_id})

    return {
        'id': doc.get('id'),
        'username': doc.get('username', ''),
        'email': doc.get('email', ''),
        'first_name': doc.get('first_name', ''),
        'last_name': doc.get('last_name', ''),
        'is_active': doc.get('is_active', True),
        'is_staff': doc.get('is_staff', False),
        'date_joined': doc.get('date_joined', '').isoformat() if hasattr(doc.get('date_joined', ''), 'isoformat') else str(doc.get('date_joined', '')),
        'last_login': doc.get('last_login', '').isoformat() if hasattr(doc.get('last_login', ''), 'isoformat') and doc.get('last_login') else None,
        'total_datasets': datasets_count,
        'total_predictions': predictions_count,
        'total_reports': reports_count,
    }


def _serialize_admin_dataset(doc):
    """Serialize a dataset doc for admin views (includes uploader info)."""
    data = serialize_dataset(doc)
    data['uploaded_by'] = _user_summary(doc.get('user_id'))
    data['memory_usage'] = doc.get('memory_usage', 0)
    return data


def _serialize_admin_prediction(doc):
    """Serialize a prediction doc for admin views."""
    data = serialize_prediction(doc)
    data['user_info'] = _user_summary(doc.get('user_id'))

    # Get dataset name
    ds = get_collection('datasets').find_one({'id': doc.get('dataset_id')})
    data['dataset_name'] = ds.get('original_filename', '') if ds else ''
    data['missing_value_strategy'] = doc.get('missing_value_strategy', 'mean')
    data['accuracy'] = doc.get('accuracy')
    return data


def _serialize_admin_report(doc):
    """Serialize a report doc for admin views."""
    data = serialize_report(doc)
    data['user_info'] = _user_summary(doc.get('user_id'))

    ds = get_collection('datasets').find_one({'id': doc.get('dataset_id')})
    data['dataset_name'] = ds.get('original_filename', '') if ds else ''

    report_type_display = {
        'eda': 'EDA Report',
        'prediction': 'Prediction Report',
        'summary': 'Dataset Summary',
    }
    data['report_type_display'] = report_type_display.get(doc.get('report_type', ''), doc.get('report_type', ''))
    return data


def _serialize_activity_log(doc):
    """Serialize an activity log doc."""
    action_display = {
        'login': 'User Login',
        'logout': 'User Logout',
        'upload': 'Dataset Upload',
        'delete_dataset': 'Dataset Delete',
        'prediction': 'Prediction Generated',
        'report_generated': 'Report Generated',
        'report_downloaded': 'Report Downloaded',
        'account_created': 'Account Created',
    }
    user = get_user_by_id(doc.get('user_id'))
    return {
        'id': doc.get('id'),
        'username': user.username if user else '',
        'action': doc.get('action', ''),
        'action_display': action_display.get(doc.get('action', ''), doc.get('action', '')),
        'details': doc.get('details', {}),
        'ip_address': doc.get('ip_address'),
        'created_at': doc.get('created_at', '').isoformat() if hasattr(doc.get('created_at', ''), 'isoformat') else str(doc.get('created_at', '')),
    }


# ===============================================
# ADMIN DASHBOARD
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    """Return overview statistics for admin dashboard."""
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    total_users = get_collection('users').count_documents({})
    active_users = get_collection('users').count_documents({
        'last_login': {'$gte': thirty_days_ago}
    })
    total_datasets = get_collection('datasets').count_documents({})
    total_predictions = get_collection('predictions').count_documents({})
    total_reports = get_collection('reports').count_documents({})
    total_csv_files = total_datasets

    # Total storage
    pipeline = [{'$group': {'_id': None, 'total': {'$sum': '$file_size'}}}]
    storage_result = list(get_collection('datasets').aggregate(pipeline))
    total_storage = storage_result[0]['total'] if storage_result else 0

    # Latest activity
    latest_activity_doc = get_collection('activity_logs').find_one(
        sort=[('created_at', -1)]
    )
    latest_activity_data = _serialize_activity_log(latest_activity_doc) if latest_activity_doc else None

    return Response({
        'total_users': total_users,
        'active_users': active_users,
        'total_datasets': total_datasets,
        'total_predictions': total_predictions,
        'total_reports': total_reports,
        'total_storage': total_storage,
        'total_csv_files': total_csv_files,
        'latest_activity': latest_activity_data,
    })


# ===============================================
# USER MANAGEMENT
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    """List all users with stats, search, filter, pagination."""
    query = {}

    # Search
    search = request.query_params.get('search', '').strip()
    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        query['$or'] = [
            {'username': regex},
            {'email': regex},
            {'first_name': regex},
            {'last_name': regex},
        ]

    # Filter by status
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        query['is_active'] = is_active.lower() == 'true'

    # Filter by role
    role = request.query_params.get('role')
    if role == 'admin':
        query['is_staff'] = True
    elif role == 'user':
        query['is_staff'] = False

    # Date filter
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = timezone.datetime.fromisoformat(date_from)
        if date_to:
            date_q['$lte'] = timezone.datetime.fromisoformat(date_to + 'T23:59:59')
        query['date_joined'] = date_q

    # Sort
    sort_by = request.query_params.get('sort_by', '-date_joined')
    sort_field = sort_by.lstrip('-')
    sort_dir = -1 if sort_by.startswith('-') else 1

    allowed_sort_fields = ['username', 'email', 'date_joined', 'last_login']
    if sort_field not in allowed_sort_fields:
        sort_field = 'date_joined'
        sort_dir = -1

    docs, meta = paginate_mongo('users', query, sort_field, sort_dir, request)
    users_data = [_serialize_admin_user(doc) for doc in docs]
    return Response({'users': users_data, 'pagination': meta})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_detail(request, pk):
    """Return detailed user info."""
    doc = get_collection('users').find_one({'id': pk})
    if not doc:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = _serialize_admin_user(doc)
    # Add storage info
    pipeline = [
        {'$match': {'user_id': pk}},
        {'$group': {'_id': None, 'total': {'$sum': '$file_size'}}},
    ]
    storage = list(get_collection('datasets').aggregate(pipeline))
    data['storage_used'] = storage[0]['total'] if storage else 0
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAdminUser])
def admin_user_update(request, pk):
    """Edit a user's profile."""
    users = get_collection('users')
    doc = users.find_one({'id': pk})
    if not doc:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    update_fields = {}

    username = request.data.get('username')
    email = request.data.get('email')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')

    if username and username != doc.get('username'):
        if users.find_one({'username': username, 'id': {'$ne': pk}}):
            return Response({'error': 'Username already taken.'}, status=status.HTTP_400_BAD_REQUEST)
        update_fields['username'] = username
    if email:
        update_fields['email'] = email
    if first_name is not None:
        update_fields['first_name'] = first_name
    if last_name is not None:
        update_fields['last_name'] = last_name

    if update_fields:
        users.update_one({'id': pk}, {'$set': update_fields})
        doc.update(update_fields)

    return Response(_serialize_admin_user(doc))


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_user_activate(request, pk):
    """Activate a user account."""
    users = get_collection('users')
    doc = users.find_one({'id': pk})
    if not doc:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    users.update_one({'id': pk}, {'$set': {'is_active': True}})
    return Response({'message': f'User {doc["username"]} activated.'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_user_deactivate(request, pk):
    """Deactivate a user account."""
    users = get_collection('users')
    doc = users.find_one({'id': pk})
    if not doc:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if doc.get('id') == request.user.id:
        return Response({'error': 'Cannot deactivate your own account.'}, status=status.HTTP_400_BAD_REQUEST)

    users.update_one({'id': pk}, {'$set': {'is_active': False}})
    return Response({'message': f'User {doc["username"]} deactivated.'})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_user_delete(request, pk):
    """Delete a user account."""
    users = get_collection('users')
    doc = users.find_one({'id': pk})
    if not doc:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if doc.get('id') == request.user.id:
        return Response({'error': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)

    username = doc.get('username', '')
    users.delete_one({'id': pk})
    return Response({'message': f'User {username} deleted.'})


# ===============================================
# DATASET MANAGEMENT
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_datasets_list(request):
    """List all datasets with search, filter, pagination."""
    query = {}

    search = request.query_params.get('search', '').strip()
    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        # For user search, find matching user IDs first
        matching_users = get_collection('users').find({'username': regex}, {'id': 1})
        matching_user_ids = [u['id'] for u in matching_users]
        query['$or'] = [
            {'original_filename': regex},
            {'user_id': {'$in': matching_user_ids}},
        ]

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = timezone.datetime.fromisoformat(date_from)
        if date_to:
            date_q['$lte'] = timezone.datetime.fromisoformat(date_to + 'T23:59:59')
        query['uploaded_at'] = date_q

    sort_by = request.query_params.get('sort_by', '-uploaded_at')
    sort_field = sort_by.lstrip('-')
    sort_dir = -1 if sort_by.startswith('-') else 1

    allowed = ['original_filename', 'uploaded_at', 'file_size', 'total_rows']
    if sort_field not in allowed:
        sort_field = 'uploaded_at'
        sort_dir = -1

    docs, meta = paginate_mongo('datasets', query, sort_field, sort_dir, request)
    return Response({
        'datasets': [_serialize_admin_dataset(d) for d in docs],
        'pagination': meta,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dataset_detail(request, pk):
    """Return detailed dataset info."""
    doc = get_collection('datasets').find_one({'id': pk})
    if not doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_admin_dataset(doc))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dataset_download(request, pk):
    """Return download URL for a dataset CSV."""
    doc = get_collection('datasets').find_one({'id': pk})
    if not doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    file_path = doc.get('file_path', '')
    return Response({
        'download_url': f'/media/{file_path}',
        'filename': doc.get('original_filename', ''),
    })


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_dataset_delete(request, pk):
    """Delete a dataset and its file."""
    datasets = get_collection('datasets')
    doc = datasets.find_one({'id': pk})
    if not doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    filename = doc.get('original_filename', '')

    # Delete file from disk
    file_path = doc.get('file_path', '')
    if file_path:
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        if os.path.exists(full_path):
            os.remove(full_path)

    datasets.delete_one({'id': pk})
    log_activity(request.user, 'delete_dataset', {'filename': filename}, request)
    return Response({'message': f'Dataset "{filename}" deleted.'})


# ===============================================
# PREDICTION MANAGEMENT
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_predictions_list(request):
    """List all predictions with search, pagination."""
    query = {}

    search = request.query_params.get('search', '').strip()
    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        matching_users = get_collection('users').find({'username': regex}, {'id': 1})
        matching_user_ids = [u['id'] for u in matching_users]
        matching_datasets = get_collection('datasets').find({'original_filename': regex}, {'id': 1})
        matching_ds_ids = [d['id'] for d in matching_datasets]
        query['$or'] = [
            {'user_id': {'$in': matching_user_ids}},
            {'dataset_id': {'$in': matching_ds_ids}},
            {'model_type': regex},
            {'target_column': regex},
        ]

    model_type = request.query_params.get('model_type')
    if model_type:
        query['model_type'] = model_type

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = timezone.datetime.fromisoformat(date_from)
        if date_to:
            date_q['$lte'] = timezone.datetime.fromisoformat(date_to + 'T23:59:59')
        query['created_at'] = date_q

    sort_by = request.query_params.get('sort_by', '-created_at')
    sort_field = sort_by.lstrip('-')
    sort_dir = -1 if sort_by.startswith('-') else 1

    allowed = ['created_at', 'r2_score', 'mae', 'model_type']
    if sort_field not in allowed:
        sort_field = 'created_at'
        sort_dir = -1

    docs, meta = paginate_mongo('predictions', query, sort_field, sort_dir, request)
    return Response({
        'predictions': [_serialize_admin_prediction(d) for d in docs],
        'pagination': meta,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_prediction_detail(request, pk):
    """Return detailed prediction info."""
    doc = get_collection('predictions').find_one({'id': pk})
    if not doc:
        return Response({'error': 'Prediction not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_admin_prediction(doc))


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_prediction_delete(request, pk):
    """Delete a prediction record."""
    predictions = get_collection('predictions')
    doc = predictions.find_one({'id': pk})
    if not doc:
        return Response({'error': 'Prediction not found.'}, status=status.HTTP_404_NOT_FOUND)

    predictions.delete_one({'id': pk})
    return Response({'message': 'Prediction deleted.'})


# ===============================================
# REPORT MANAGEMENT
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_reports_list(request):
    """List all reports with pagination."""
    query = {}

    search = request.query_params.get('search', '').strip()
    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        matching_users = get_collection('users').find({'username': regex}, {'id': 1})
        matching_user_ids = [u['id'] for u in matching_users]
        matching_datasets = get_collection('datasets').find({'original_filename': regex}, {'id': 1})
        matching_ds_ids = [d['id'] for d in matching_datasets]
        query['$or'] = [
            {'user_id': {'$in': matching_user_ids}},
            {'dataset_id': {'$in': matching_ds_ids}},
            {'report_type': regex},
        ]

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = timezone.datetime.fromisoformat(date_from)
        if date_to:
            date_q['$lte'] = timezone.datetime.fromisoformat(date_to + 'T23:59:59')
        query['created_at'] = date_q

    docs, meta = paginate_mongo('reports', query, 'created_at', -1, request)
    return Response({
        'reports': [_serialize_admin_report(d) for d in docs],
        'pagination': meta,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_report_download(request, pk):
    """Return download URL for a report."""
    doc = get_collection('reports').find_one({'id': pk})
    if not doc:
        return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

    get_collection('reports').update_one(
        {'id': pk},
        {'$inc': {'download_count': 1}},
    )
    file_path = doc.get('file_path', '')
    return Response({'download_url': f'/media/{file_path}'})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_report_delete(request, pk):
    """Delete a report."""
    reports = get_collection('reports')
    doc = reports.find_one({'id': pk})
    if not doc:
        return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

    file_path = doc.get('file_path', '')
    if file_path:
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        if os.path.exists(full_path):
            os.remove(full_path)

    reports.delete_one({'id': pk})
    return Response({'message': 'Report deleted.'})


# ===============================================
# ACTIVITY LOGS
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_activity_logs(request):
    """List activity logs with filtering and pagination."""
    query = {}

    search = request.query_params.get('search', '').strip()
    if search:
        regex = re.compile(re.escape(search), re.IGNORECASE)
        matching_users = get_collection('users').find({'username': regex}, {'id': 1})
        matching_user_ids = [u['id'] for u in matching_users]
        query['$or'] = [
            {'user_id': {'$in': matching_user_ids}},
            {'action': regex},
        ]

    action = request.query_params.get('action')
    if action:
        query['action'] = action

    user_id = request.query_params.get('user_id')
    if user_id:
        try:
            query['user_id'] = int(user_id)
        except (ValueError, TypeError):
            pass

    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q['$gte'] = timezone.datetime.fromisoformat(date_from)
        if date_to:
            date_q['$lte'] = timezone.datetime.fromisoformat(date_to + 'T23:59:59')
        query['created_at'] = date_q

    docs, meta = paginate_mongo('activity_logs', query, 'created_at', -1, request)
    return Response({
        'logs': [_serialize_activity_log(d) for d in docs],
        'pagination': meta,
    })



# ===============================================
# ADMIN PROFILE
# ===============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_profile(request):
    """Return admin profile with login history."""
    user = request.user

    login_docs = list(
        get_collection('activity_logs')
        .find({'user_id': user.id, 'action': 'login'})
        .sort('created_at', -1)
        .limit(20)
    )

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined.isoformat() if hasattr(user.date_joined, 'isoformat') else str(user.date_joined),
            'last_login': user.last_login.isoformat() if user.last_login and hasattr(user.last_login, 'isoformat') else None,
        },
        'login_history': [_serialize_activity_log(d) for d in login_docs],
    })
