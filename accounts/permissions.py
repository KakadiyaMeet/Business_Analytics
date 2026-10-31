"""
accounts.permissions — Custom DRF permission classes.

IsAdminUser: Allows access only to users with is_staff=True.
Works with MongoUser objects.
"""

from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allow access only to admin users (is_staff=True).
    Returns HTTP 403 for non-admin users.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'is_staff', False)
        )
