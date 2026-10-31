"""
accounts.views — Authentication views.

Handles login, register, logout, current user info, profile update, and password change.
All user data stored in MongoDB. Uses custom auth helpers instead of django.contrib.auth.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from config.mongo_user import (
    authenticate_user,
    create_user,
    get_user_by_id,
    get_user_by_username,
)
from config.mongo_auth import login, logout
from config.mongodb import get_collection
from activity.services import log_activity


# ===============================================
# AUTHENTICATION
# ===============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    """Authenticate user and create session."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate_user(username, password)
    if user is not None:
        if not user.is_active:
            return Response(
                {'error': 'Your account has been deactivated. Contact an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        login(request, user)
        log_activity(user, 'login', request=request)
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': 'admin' if user.is_staff else 'user',
            }
        })
    return Response(
        {'error': 'Invalid username or password.'},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_register(request):
    """Create a new user account."""
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')

    if not username or not email or not password:
        return Response(
            {'error': 'Username, email, and password are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check existing username
    if get_user_by_username(username):
        return Response(
            {'error': 'Username already exists.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user, error = create_user(username=username, email=email, password=password)
    if error:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    login(request, user)
    log_activity(user, 'account_created', request=request)
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': 'user',
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def auth_logout(request):
    """Destroy user session."""
    if request.user.is_authenticated:
        log_activity(request.user, 'logout', request=request)
    logout(request)
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET'])
def auth_user(request):
    """Return current authenticated user info."""
    if request.user.is_authenticated:
        return Response({
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': 'admin' if request.user.is_staff else 'user',
            }
        })
    return Response({'user': None}, status=status.HTTP_401_UNAUTHORIZED)


# ===============================================
# PROFILE MANAGEMENT
# ===============================================

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user's profile (username, email)."""
    user = request.user
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()

    users_col = get_collection('users')

    if username and username != user.username:
        if users_col.find_one({'username': username, 'id': {'$ne': user.id}}):
            return Response(
                {'error': 'Username already taken.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.username = username

    if email:
        user.email = email

    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name

    user.save()
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': 'admin' if user.is_staff else 'user',
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change current user's password."""
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not current_password or not new_password:
        return Response(
            {'error': 'Current and new passwords are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 6:
        return Response(
            {'error': 'New password must be at least 6 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not request.user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.set_password(new_password)
    request.user.save()
    # Re-login to maintain session after password change
    login(request, request.user)
    return Response({'message': 'Password changed successfully.'})
