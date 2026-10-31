"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more inormation please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView

urlpatterns = [
    path('api/', include('accounts.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('upload.urls')),
    path('api/', include('eda.urls')),
    path('api/', include('visualization.urls')),
    path('api/', include('prediction.urls')),
    path('api/', include('reports.urls')),
    path('api/admin-panel/', include('adminpanel.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all: serve React's index.html for any route not matched above.
# This MUST be the last pattern so that /admin, /api, and /media are handled first.
urlpatterns += [
    re_path(r'^(?!static/).*$', TemplateView.as_view(template_name='index.html')),
]
