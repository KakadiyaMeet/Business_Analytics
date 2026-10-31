from django.urls import path
from . import views

app_name = 'upload'

urlpatterns = [
    path('upload/', views.upload_csv, name='upload_csv'),
    path('datasets/', views.get_datasets, name='get_datasets'),
    path('datasets/<int:pk>/preview/', views.get_dataset_preview, name='dataset_preview'),
]
