from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('dashboard/', views.get_dashboard_summary, name='dashboard_summary'),
]
