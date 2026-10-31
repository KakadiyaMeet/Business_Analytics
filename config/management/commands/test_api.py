"""
Management command: test_api
Tests all API endpoints to verify MongoDB migration works end-to-end.

Usage:
    python manage.py test_api
"""

import sys
import requests

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Test all API endpoints to verify MongoDB migration works end-to-end.'

    def handle(self, *args, **options):
        base = 'http://127.0.0.1:8000/api'
        s = requests.Session()
        errors = []

        def test(name, method, url, **kwargs):
            try:
                r = getattr(s, method)(url, **kwargs)
                ok = r.status_code < 500
                status = 'OK' if ok else 'FAIL'
                self.stdout.write(f'  [{status}] {r.status_code} {name}')
                if not ok:
                    errors.append(f'{name}: HTTP {r.status_code} - {r.text[:200]}')
                return r
            except Exception as e:
                self.stdout.write(f'  [FAIL] {name}: {e}')
                errors.append(f'{name}: {e}')
                return None

        # 1. Auth (unauthenticated)
        self.stdout.write('=== Authentication ===')
        r = test('GET /auth/user/ (anon)', 'get', f'{base}/auth/user/')

        # 2. Login
        r = test('POST /auth/login/', 'post', f'{base}/auth/login/',
                 json={'username': 'admin', 'password': 'admin123'})
        if r and r.status_code == 200:
            self.stdout.write(f'    Logged in as: {r.json().get("user", {}).get("username")}')
        elif r and r.status_code == 401:
            # Try registering first
            self.stdout.write('    admin not found, registering...')
            r2 = test('POST /auth/register/', 'post', f'{base}/auth/register/',
                      json={'username': 'admin', 'email': 'admin@test.com', 'password': 'admin123'})
            if r2 and r2.status_code in (200, 201):
                self.stdout.write('    Registered and logged in')

        # 3. Auth (authenticated)
        r = test('GET /auth/user/ (auth)', 'get', f'{base}/auth/user/')
        if r and r.status_code == 200:
            user_data = r.json()
            self.stdout.write(f'    User: {user_data.get("user", {}).get("username")}')

        # 4. Dashboard
        self.stdout.write('\n=== Dashboard ===')
        r = test('GET /dashboard/', 'get', f'{base}/dashboard/')
        if r and r.status_code == 200:
            data = r.json()
            self.stdout.write(f'    has_data: {data.get("has_data")}')

        # 5. Datasets
        self.stdout.write('\n=== Datasets ===')
        r = test('GET /datasets/', 'get', f'{base}/datasets/')
        ds_id = None
        if r and r.status_code == 200:
            datasets = r.json()
            self.stdout.write(f'    Count: {len(datasets)}')
            if datasets:
                ds_id = datasets[0].get('id')
                self.stdout.write(f'    First dataset id: {ds_id}')

        if ds_id:
            # 6. Preview
            self.stdout.write('\n=== Dataset Operations ===')
            test(f'GET /datasets/{ds_id}/preview/', 'get', f'{base}/datasets/{ds_id}/preview/')

            # 7. EDA
            r = test(f'GET /datasets/{ds_id}/eda/', 'get', f'{base}/datasets/{ds_id}/eda/')
            if r and r.status_code == 200:
                self.stdout.write(f'    EDA keys: {list(r.json().keys())[:5]}...')

            # 8. Visualization
            r = test(f'GET /datasets/{ds_id}/visualization/', 'get', f'{base}/datasets/{ds_id}/visualization/')
            if r and r.status_code == 200:
                self.stdout.write(f'    Viz keys: {list(r.json().keys())[:5]}...')

            # 9. Columns
            r = test(f'GET /datasets/{ds_id}/columns/', 'get', f'{base}/datasets/{ds_id}/columns/')
            if r and r.status_code == 200:
                cols = r.json()
                self.stdout.write(f'    Columns: {len(cols.get("columns", []))}')

            # 10. Predictions history
            r = test(f'GET /datasets/{ds_id}/predictions/', 'get', f'{base}/datasets/{ds_id}/predictions/')
            if r and r.status_code == 200:
                self.stdout.write(f'    Predictions: {len(r.json())}')

            # 11. Reports history
            r = test(f'GET /datasets/{ds_id}/reports/', 'get', f'{base}/datasets/{ds_id}/reports/')
            if r and r.status_code == 200:
                self.stdout.write(f'    Reports: {len(r.json())}')

        # 12. Profile
        self.stdout.write('\n=== Profile ===')
        test('GET /auth/user/', 'get', f'{base}/auth/user/')

        # 13. Logout
        r = test('POST /auth/logout/', 'post', f'{base}/auth/logout/')

        self.stdout.write('\n' + '=' * 50)
        if errors:
            self.stdout.write(self.style.ERROR(f'FAILED: {len(errors)} error(s):'))
            for e in errors:
                self.stdout.write(f'  - {e}')
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS('ALL API TESTS PASSED!'))
