"""
reports.views — Report generation and listing views.

Uses MongoDB for dataset/report lookups instead of Django ORM.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from config.mongodb import get_collection
from upload.services import get_dataset_by_id
from . import services
from .services import serialize_report



# ===============================================
# REPORT GENERATION
# ===============================================

@api_view(['POST'])
def generate_report(request, pk):
    """Generate a downloadable PDF report — delegates to services."""
    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    report_type = request.data.get('report_type', 'summary')
    if report_type not in ['eda', 'prediction', 'summary']:
        return Response({'error': 'Invalid report type.'}, status=status.HTTP_400_BAD_REQUEST)

    data, error, http_status = services.generate_pdf_report(dataset_doc, report_type, user=request.user)
    if error:
        return Response({'error': error}, status=http_status)

    return Response(data, status=http_status)


@api_view(['GET'])
def get_reports(request, pk):
    """List all generated reports for a dataset."""
    dataset_doc = get_dataset_by_id(pk, user=request.user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    reports = get_collection('reports')
    docs = reports.find({
        'dataset_id': int(pk),
        'user_id': request.user.id,
    }).sort('created_at', -1)

    return Response([serialize_report(doc) for doc in docs])
