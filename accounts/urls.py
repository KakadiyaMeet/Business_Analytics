from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('auth/login/', views.auth_login, name='auth_login'),
    path('auth/register/', views.auth_register, name='auth_register'),
    path('auth/logout/', views.auth_logout, name='auth_logout'),
    path('auth/user/', views.auth_user, name='auth_user'),
    path('auth/profile/', views.update_profile, name='update_profile'),
    path('auth/change-password/', views.change_password, name='change_password'),
]
