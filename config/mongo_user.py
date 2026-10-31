"""
config/mongo_user.py — MongoDB-backed user model and repository.

Provides:
- MongoUser: A lightweight user object compatible with Django middleware and DRF.
- AnonymousMongoUser: Placeholder for unauthenticated requests.
- Repository functions: create, authenticate, find, update users in MongoDB.
"""

from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone

from .mongodb import get_collection, get_next_id


# ============================================================
# User Classes
# ============================================================

class MongoUser:
    """
    User object backed by MongoDB.

    Exposes the same attributes Django's auth middleware and DRF
    permission classes expect (is_authenticated, is_staff, pk, etc.).
    """

    def __init__(self, data=None):
        data = data or {}
        # Handle id variations: 'id' or 'django_user_id'
        self.id = data.get('id') or data.get('django_user_id')
        self.pk = self.id
        self.username = data.get('username', '')
        self.email = data.get('email', '')
        self.first_name = data.get('first_name', '')
        self.last_name = data.get('last_name', '')
        # Handle password variations: 'password' or 'hashed_password'
        self.password = data.get('password') or data.get('hashed_password', '')
        self.is_active = data.get('is_active', True)
        # Handle staff variations: 'is_staff' or derive from 'role'
        if 'is_staff' in data:
            self.is_staff = data['is_staff']
        else:
            self.is_staff = data.get('role', '') == 'admin'
        self.is_superuser = data.get('is_superuser', False)
        self.date_joined = data.get('date_joined') or data.get('created_at', timezone.now())
        self.last_login = data.get('last_login')

    # --- Django compat properties ---
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    # --- Password helpers ---
    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    # --- Persistence ---
    def save(self):
        """Persist current state to MongoDB."""
        users = get_collection('users')
        users.update_one(
            {'id': self.id},
            {'$set': self._to_doc()},
            upsert=True,
        )

    def _to_doc(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'password': self.password,
            'is_active': self.is_active,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
            'date_joined': self.date_joined,
            'last_login': self.last_login,
        }

    def __str__(self):
        return self.username

    def get_username(self):
        return self.username


class AnonymousMongoUser:
    """Anonymous user placeholder — returned when no user is logged in."""
    id = None
    pk = None
    username = ''
    is_authenticated = False
    is_anonymous = True
    is_active = False
    is_staff = False
    is_superuser = False


# ============================================================
# Repository Functions
# ============================================================

def get_user_by_id(user_id):
    """Fetch a user from MongoDB by integer ID."""
    if user_id is None:
        return None
    doc = get_collection('users').find_one({'id': int(user_id)})
    return MongoUser(doc) if doc else None


def get_user_by_username(username):
    """Fetch a user from MongoDB by username (case-sensitive)."""
    doc = get_collection('users').find_one({'username': username})
    return MongoUser(doc) if doc else None


def create_user(username, email, password, is_staff=False, is_superuser=False):
    """
    Create a new user in MongoDB.

    Returns:
        Tuple of (MongoUser, error_string). error_string is None on success.
    """
    users = get_collection('users')

    if users.find_one({'username': username}):
        return None, 'Username already exists.'

    user_id = get_next_id('users')
    now = timezone.now()

    doc = {
        'id': user_id,
        'username': username,
        'email': email,
        'password': make_password(password),
        'first_name': '',
        'last_name': '',
        'is_active': True,
        'is_staff': is_staff,
        'is_superuser': is_superuser,
        'date_joined': now,
        'last_login': None,
    }
    users.insert_one(doc)
    return MongoUser(doc), None


def authenticate_user(username, password):
    """
    Authenticate a user against MongoDB.

    Returns MongoUser on success, None on failure.
    """
    user = get_user_by_username(username)
    if user and user.is_active and user.check_password(password):
        return user
    return None


def user_exists(username):
    """Check if a username exists in MongoDB."""
    return get_collection('users').find_one({'username': username}) is not None


def update_last_login(user_id):
    """Update last_login timestamp for a user."""
    get_collection('users').update_one(
        {'id': user_id},
        {'$set': {'last_login': timezone.now()}},
    )
