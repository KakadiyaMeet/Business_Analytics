"""
adminpanel.urls — Admin panel URL routes.

All routes are prefixed with /api/admin/ via config/urls.py.
"""

from django.urls import path
from . import views

app_name = 'adminpanel'

urlpatterns = [
    # Dashboard
    path('dashboard/', views.admin_dashboard, name='admin_dashboard'),

    # User Management
    path('users/', views.admin_users_list, name='admin_users_list'),
    path('users/<int:pk>/', views.admin_user_detail, name='admin_user_detail'),
    path('users/<int:pk>/update/', views.admin_user_update, name='admin_user_update'),
    path('users/<int:pk>/activate/', views.admin_user_activate, name='admin_user_activate'),
    path('users/<int:pk>/deactivate/', views.admin_user_deactivate, name='admin_user_deactivate'),
    path('users/<int:pk>/delete/', views.admin_user_delete, name='admin_user_delete'),

    # Dataset Management
    path('datasets/', views.admin_datasets_list, name='admin_datasets_list'),
    path('datasets/<int:pk>/', views.admin_dataset_detail, name='admin_dataset_detail'),
    path('datasets/<int:pk>/download/', views.admin_dataset_download, name='admin_dataset_download'),
    path('datasets/<int:pk>/delete/', views.admin_dataset_delete, name='admin_dataset_delete'),

    # Prediction Management
    path('predictions/', views.admin_predictions_list, name='admin_predictions_list'),
    path('predictions/<int:pk>/', views.admin_prediction_detail, name='admin_prediction_detail'),
    path('predictions/<int:pk>/delete/', views.admin_prediction_delete, name='admin_prediction_delete'),

    # Report Management
    path('reports/', views.admin_reports_list, name='admin_reports_list'),
    path('reports/<int:pk>/download/', views.admin_report_download, name='admin_report_download'),
    path('reports/<int:pk>/delete/', views.admin_report_delete, name='admin_report_delete'),


    # Activity Logs
    path('activity-logs/', views.admin_activity_logs, name='admin_activity_logs'),

    # Admin Profile
    path('profile/', views.admin_profile, name='admin_profile'),
]
