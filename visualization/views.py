"""
visualization.views — Chart data views.

Uses MongoDB to fetch dataset, Pandas for all visualization data generation.
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from upload.services import get_dataset_by_id
from . import services


# ===============================================
# VISUALIZATION DATA
# ===============================================

@api_view(['GET'])
def get_visualization_data(request, pk):
    """Return chart-ready data — delegates to services."""
    # Admins can view visualization for any dataset
    user = None if getattr(request.user, 'is_staff', False) else request.user
    dataset_doc = get_dataset_by_id(pk, user=user)
    if not dataset_doc:
        return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        data = services.get_chart_data(dataset_doc, user=request.user)
    except FileNotFoundError as e:
        return Response(
            {'error': f'Dataset file is missing on the server. Please re-upload. ({e})'},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        return Response(
            {'error': f'Visualization generation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(data)
