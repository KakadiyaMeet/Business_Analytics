from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('datasets/<int:pk>/report/', views.generate_report, name='generate_report'),
    path('datasets/<int:pk>/reports/', views.get_reports, name='get_reports'),
]
