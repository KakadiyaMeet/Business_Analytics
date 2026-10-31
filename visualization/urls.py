from django.urls import path
from . import views

app_name = 'visualization'

urlpatterns = [
    path('datasets/<int:pk>/visualization/', views.get_visualization_data, name='dataset_visualization'),
]
