"""
Django settings for the Business Analytics backend.

MongoDB is the primary database for all application data.
SQLite is only kept as an in-memory stub so Django internals don't crash.
No db.sqlite3 file is created on disk.
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-hqmem%l(sko76cggm5u$6ce%j0)rxae0stmxfcku87gjr5u=hf'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# ===============================================
# MongoDB Configuration (primary database)
# ===============================================

MONGO_URI = 'mongodb://localhost:27017'
MONGO_DB_NAME = 'business_analytics'


# ===============================================
# Application definition
# ===============================================

INSTALLED_APPS = [
    # Django framework (staticfiles for serving static files in dev)
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Project config (management commands)
    'config',
    # Project apps
    'accounts',
    'dashboard',
    'upload',
    'eda',
    'visualization',
    'prediction',
    'reports',
    'activity',
    'adminpanel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # Custom MongoDB auth — replaces django.contrib.auth.middleware.AuthenticationMiddleware
    'config.mongo_auth.MongoAuthMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

# Path to the React production build
REACT_APP_DIR = os.path.join(BASE_DIR, '..', 'frontend', 'dist')

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [REACT_APP_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# ===============================================
# Database — in-memory stub (not used for app data)
# ===============================================
# Django requires a default database to be configured.
# Using in-memory SQLite so NO db.sqlite3 file is created on disk.
# All application data lives in MongoDB.

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}


# ===============================================
# Sessions — signed-cookie (no DB required)
# ===============================================

SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 86400 * 7  # 7 days


# ===============================================
# Password hashers (used by MongoUser via django.contrib.auth.hashers)
# ===============================================

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]


# ===============================================
# Internationalization
# ===============================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ===============================================
# Static / Media files
# ===============================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, '..', 'frontend', 'dist'),
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ===============================================
# File uploads (50 MB)
# ===============================================

DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800


# ===============================================
# CORS
# ===============================================

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]


# ===============================================
# REST Framework
# ===============================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'config.mongo_auth.MongoSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Override defaults so DRF never tries to import django.contrib.auth.models
    # (which requires contenttypes app that we don't use with MongoDB).
    'UNAUTHENTICATED_USER': 'config.mongo_user.AnonymousMongoUser',
    'UNAUTHENTICATED_TOKEN': None,
}
