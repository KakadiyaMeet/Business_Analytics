# Architecture

## Overview

Business Analytics is a full-stack web application for data analysis, visualization, and machine learning prediction.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, React Router 7 |
| Backend | Django 5.2, Django REST Framework |
| Database | SQLite (default) |
| ML | scikit-learn, pandas, numpy |
| Reports | xhtml2pdf, matplotlib |

## Backend Architecture

```
backend/
├── config/          # Django project settings, URLs, WSGI/ASGI
├── apps/            # Django applications
│   └── analytics_api/  # Main API app (models, serializers, URLs, views)
├── services/        # Business logic layer
├── ml/              # Machine learning algorithms
├── core/            # Reusable helpers (auth, utils)
├── media/           # User-uploaded files and generated reports
├── static/          # Static assets
└── logs/            # Application logs
```

### Separation of Concerns

- **Views** → Validate requests, call services, return responses
- **Services** → Business logic orchestration
- **ML** → Algorithm implementations (preprocessing, models, metrics)
- **Core** → Shared utilities and authentication

## Frontend Architecture

```
frontend/src/
├── api/             # Axios config and API call modules
├── components/      # Reusable UI components
├── pages/           # Page-level components
├── styles/          # Global CSS
├── hooks/           # Custom React hooks
├── context/         # React context providers
├── utils/           # Utility functions
└── routes/          # Route configuration
```
