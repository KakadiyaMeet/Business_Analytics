"""
config/mongo_auth.py — Custom authentication infrastructure for MongoDB.

Provides:
- MongoAuthMiddleware: Replaces Django's AuthenticationMiddleware.
  Reads user ID from session and sets request.user from MongoDB.
- MongoSessionAuthentication: DRF authentication class.
  CSRF-exempt session-based auth using the MongoDB user.
- login() / logout(): Session helpers mirroring Django's auth functions.
"""

from django.utils.deprecation import MiddlewareMixin
from rest_framework.authentication import BaseAuthentication

from .mongo_user import get_user_by_id, AnonymousMongoUser, update_last_login

# Session key where we store the logged-in user's integer ID
SESSION_KEY = '_mongo_user_id'


# ============================================================
# Middleware
# ============================================================

class MongoAuthMiddleware(MiddlewareMixin):
    """
    Set request.user from session on every request.

    Replaces django.contrib.auth.middleware.AuthenticationMiddleware.
    """

    def process_request(self, request):
        user_id = request.session.get(SESSION_KEY)
        if user_id is not None:
            user = get_user_by_id(user_id)
            if user and user.is_active:
                request.user = user
                return
        request.user = AnonymousMongoUser()


# ============================================================
# DRF Authentication Class
# ============================================================

class MongoSessionAuthentication(BaseAuthentication):
    """
    DRF authentication that reads the user set by MongoAuthMiddleware.

    CSRF enforcement is intentionally skipped (matching the project's
    existing CsrfExemptSessionAuthentication behaviour).
    """

    def authenticate(self, request):
        # IMPORTANT: Access the underlying Django HttpRequest, NOT the DRF
        # Request wrapper. DRF's Request.user triggers _authenticate() which
        # calls this method → infinite recursion if we use request.user here.
        # Use _request if it exists (DRF Request), otherwise use request itself
        # (plain Django WSGIRequest where .user is a simple attribute, not a property).
        http_request = getattr(request, '_request', request)
        user = getattr(http_request, 'user', None)
        if user and getattr(user, 'is_authenticated', False):
            return (user, None)
        return None


# ============================================================
# Login / Logout Helpers
# ============================================================

def login(request, user):
    """
    Persist user identity in the session.

    Mirrors django.contrib.auth.login — stores user ID in session,
    updates last_login, and sets request.user.
    """
    # Cycle the session key to prevent session fixation
    request.session.cycle_key()
    request.session[SESSION_KEY] = user.id
    request.session.modified = True
    request.user = user
    update_last_login(user.id)


def logout(request):
    """
    Remove user identity from the session.

    Mirrors django.contrib.auth.logout — flushes the session
    and resets request.user to anonymous.
    """
    request.session.flush()
    request.user = AnonymousMongoUser()
