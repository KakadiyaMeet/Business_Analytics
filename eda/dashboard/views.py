"""
dashboard.views — Dashboard summary views.

Extracted from apps/analytics_api/views.py.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services


# ===============================================
# DASHBOARD SUMMARY
# ===============================================

@api_view(['GET'])
def get_dashboard_summary(request):
    """Return dashboard KPIs from the user's latest uploaded dataset."""
    data = services.get_dashboard_data(user=request.user)
    return Response(data)
