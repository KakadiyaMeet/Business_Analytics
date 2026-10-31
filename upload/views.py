"""
upload.views — Dataset upload, listing, and preview views.

Uses MongoDB via upload.services instead of Django ORM.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services
from activity.services import log_activity


# ===============================================
# UPLOAD CSV
# ===============================================

@api_view(['POST'])
def upload_csv(request):
    """Upload a CSV file — delegates to services."""
    csv_file = request.FILES.get('file')
    data, error = services.process_csv_upload(csv_file, user=request.user)
    if error:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
    log_activity(request.user, 'upload', {
        'filename': csv_file.name if csv_file else '',
        'dataset_id': data.get('dataset', {}).get('id'),
    }, request)
    return Response(data, status=status.HTTP_201_CREATED)


# ===============================================
# LIST DATASETS
# ===============================================

@api_view(['GET'])
def get_datasets(request):
    """List all uploaded datasets for the current user, newest first."""
    data = services.list_datasets(user=request.user)
    return Response(data)


# ===============================================
# DATASET PREVIEW
# ===============================================

@api_view(['GET'])
def get_dataset_preview(request, pk):
    """Return first N rows of a dataset."""
    dataset_doc = services.get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    n = int(request.query_params.get('rows', 10))
    data = services.get_preview(dataset_doc, num_rows=n)
    return Response(data)
