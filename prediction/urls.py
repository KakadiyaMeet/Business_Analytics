from django.urls import path
from . import views

app_name = 'prediction'

urlpatterns = [
    path('datasets/<int:pk>/columns/', views.get_dataset_columns, name='dataset_columns'),
    path('datasets/<int:pk>/predict/', views.run_prediction, name='run_prediction'),
    path('datasets/<int:pk>/predictions/', views.get_prediction_history, name='prediction_history'),
    path('datasets/<int:pk>/compare/', views.run_batch_comparison, name='batch_comparison'),
]
