from django.urls import path
from . import views

app_name = 'eda'

urlpatterns = [
    path('datasets/<int:pk>/eda/', views.get_eda, name='dataset_eda'),
]
