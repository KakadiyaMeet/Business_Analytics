"""
Management command: migrate_to_mongo
One-time migration script: SQLite → MongoDB.

Reads existing data from db.sqlite3 and inserts equivalent documents
into MongoDB. Safe to run multiple times (uses upsert logic).

Usage:
    python manage.py migrate_to_mongo
"""

import json
import os
import sqlite3
from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from config.mongodb import get_db, get_collection, ensure_indexes


class Command(BaseCommand):
    help = 'One-time migration from SQLite (db.sqlite3) to MongoDB.'

    def handle(self, *args, **options):
        db_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')

        if not os.path.exists(db_path):
            self.stdout.write(f"[SKIP] No SQLite database found at {db_path}")
            self.stdout.write("[INFO] Nothing to migrate. Starting fresh with MongoDB.")
            ensure_indexes()
            self.stdout.write("[DONE] MongoDB indexes created.")
            return

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        db = get_db()
        max_ids = {}

        # ---- 1. Migrate Users ----
        self.stdout.write("[1/5] Migrating users...")
        try:
            cursor.execute("SELECT * FROM auth_user")
            users = cursor.fetchall()
            for row in users:
                doc = {
                    'id': row['id'],
                    'username': row['username'],
                    'email': row['email'] or '',
                    'password': row['password'],
                    'first_name': row['first_name'] or '',
                    'last_name': row['last_name'] or '',
                    'is_active': bool(row['is_active']),
                    'is_staff': bool(row['is_staff']),
                    'is_superuser': bool(row['is_superuser']),
                    'date_joined': self._parse_dt(row['date_joined']),
                    'last_login': self._parse_dt(row['last_login']),
                }
                db.users.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            max_ids['users'] = max((r['id'] for r in users), default=0)
            self.stdout.write(f"   Migrated {len(users)} users.")
        except sqlite3.OperationalError as e:
            self.stdout.write(f"   [WARN] Skipping users: {e}")

        # ---- 2. Migrate Datasets ----
        self.stdout.write("[2/5] Migrating datasets...")
        try:
            cursor.execute("SELECT * FROM analytics_api_dataset")
            datasets = cursor.fetchall()
            for row in datasets:
                doc = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'file_path': row['file'] if row['file'] else '',
                    'original_filename': row['original_filename'],
                    'uploaded_at': self._parse_dt(row['uploaded_at']),
                    'total_rows': row['total_rows'],
                    'total_columns': row['total_columns'],
                    'numeric_columns_count': row['numeric_columns_count'],
                    'categorical_columns_count': row['categorical_columns_count'],
                    'missing_values_count': row['missing_values_count'],
                    'duplicate_rows_count': row['duplicate_rows_count'],
                    'columns_json': self._safe_json(row['columns_json']),
                    'file_size': row['file_size'],
                    'memory_usage': row['memory_usage'],
                }
                db.datasets.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            max_ids['datasets'] = max((r['id'] for r in datasets), default=0)
            self.stdout.write(f"   Migrated {len(datasets)} datasets.")
        except sqlite3.OperationalError as e:
            self.stdout.write(f"   [WARN] Skipping datasets: {e}")

        # ---- 3. Migrate Predictions ----
        self.stdout.write("[3/5] Migrating predictions...")
        try:
            cursor.execute("SELECT * FROM analytics_api_predictionrun")
            predictions = cursor.fetchall()
            for row in predictions:
                doc = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'dataset_id': row['dataset_id'],
                    'model_type': row['model_type'],
                    'target_column': row['target_column'],
                    'features_json': self._safe_json(row['features_json']),
                    'split_pct': row['split_pct'],
                    'missing_value_strategy': row['missing_value_strategy'] if 'missing_value_strategy' in row.keys() else 'mean',
                    'r2_score': row['r2_score'],
                    'mae': row['mae'],
                    'mse': row['mse'],
                    'rmse': row['rmse'],
                    'accuracy': row['accuracy'] if 'accuracy' in row.keys() else None,
                    'results_json': self._safe_json(row['results_json']),
                    'created_at': self._parse_dt(row['created_at']),
                }
                db.predictions.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            max_ids['predictions'] = max((r['id'] for r in predictions), default=0)
            self.stdout.write(f"   Migrated {len(predictions)} predictions.")
        except sqlite3.OperationalError as e:
            self.stdout.write(f"   [WARN] Skipping predictions: {e}")

        # ---- 4. Migrate Reports ----
        self.stdout.write("[4/5] Migrating reports...")
        try:
            cursor.execute("SELECT * FROM analytics_api_generatedreport")
            reports = cursor.fetchall()
            for row in reports:
                doc = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'dataset_id': row['dataset_id'],
                    'report_type': row['report_type'],
                    'file_path': row['file'] if row['file'] else '',
                    'file_size': row['file_size'],
                    'download_count': row['download_count'],
                    'created_at': self._parse_dt(row['created_at']),
                }
                db.reports.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            max_ids['reports'] = max((r['id'] for r in reports), default=0)
            self.stdout.write(f"   Migrated {len(reports)} reports.")
        except sqlite3.OperationalError as e:
            self.stdout.write(f"   [WARN] Skipping reports: {e}")

        # ---- 5. Migrate Activity Logs ----
        self.stdout.write("[5/5] Migrating activity logs...")
        try:
            cursor.execute("SELECT * FROM activity_log")
            logs = cursor.fetchall()
            for row in logs:
                doc = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'action': row['action'],
                    'details': self._safe_json(row['details']),
                    'ip_address': row['ip_address'],
                    'created_at': self._parse_dt(row['created_at']),
                }
                db.activity_logs.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            max_ids['activity_logs'] = max((r['id'] for r in logs), default=0)
            self.stdout.write(f"   Migrated {len(logs)} activity logs.")
        except sqlite3.OperationalError as e:
            self.stdout.write(f"   [WARN] Skipping activity logs: {e}")

        conn.close()

        # ---- Set counters so auto-increment continues correctly ----
        for col_name, max_id in max_ids.items():
            if max_id > 0:
                db.counters.update_one(
                    {'_id': col_name},
                    {'$set': {'seq': max_id}},
                    upsert=True,
                )
        self.stdout.write(f"\n[DONE] Auto-increment counters set: {max_ids}")

        # ---- Create indexes ----
        ensure_indexes()
        self.stdout.write("[DONE] MongoDB indexes created.")
        self.stdout.write(self.style.SUCCESS("\nMigration complete! You can now delete db.sqlite3."))

    def _parse_dt(self, value):
        """Parse a datetime string from SQLite into a datetime object."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        for fmt in ('%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S'):
            try:
                dt = datetime.strptime(value, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return value

    def _safe_json(self, value):
        """Parse a JSON field from SQLite."""
        if value is None:
            return {}
        if isinstance(value, (dict, list)):
            return value
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return {}
