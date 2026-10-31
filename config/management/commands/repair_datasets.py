"""
Management command: repair_datasets
Normalizes all MongoDB dataset documents to the correct schema.
Fixes missing 'id' field, ensures all required fields exist, and removes
records whose CSV files are missing from disk.

Usage:
    python manage.py repair_datasets
"""

import os
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from config.mongodb import get_collection, get_next_id


class Command(BaseCommand):
    help = 'Normalize MongoDB dataset documents and remove records with missing files.'

    def handle(self, *args, **options):
        datasets_col = get_collection('datasets')
        all_datasets = list(datasets_col.find({}))

        self.stdout.write(f"Found {len(all_datasets)} dataset(s) in MongoDB.")
        fixed = 0
        deleted = 0

        for doc in all_datasets:
            updates = {}
            filename = doc.get('original_filename', doc.get('filename', '???'))
            file_path = doc.get('file_path', '')

            # --- Check if the CSV file actually exists on disk ---
            if os.path.isabs(file_path):
                full_path = file_path
            else:
                full_path = os.path.join(settings.MEDIA_ROOT, file_path)

            if not os.path.exists(full_path):
                # File is missing — delete this stale record
                datasets_col.delete_one({'_id': doc['_id']})
                deleted += 1
                self.stdout.write(f"  DELETED id={doc.get('id')} ({filename}) — file missing: {file_path}")
                continue

            # --- Fix absolute paths → convert to relative ---
            if os.path.isabs(file_path):
                media_root_str = str(settings.MEDIA_ROOT)
                if file_path.startswith(media_root_str):
                    rel_path = os.path.relpath(file_path, media_root_str)
                    updates['file_path'] = rel_path
                    self.stdout.write(f"  FIXED PATH id={doc.get('id')} ({filename}) — absolute → {rel_path}")

            # Fix missing 'id'
            if not doc.get('id'):
                new_id = get_next_id('datasets')
                updates['id'] = new_id

            # Fix missing fields with defaults
            if 'total_rows' not in doc:
                updates['total_rows'] = doc.get('rows', 0)
            if 'total_columns' not in doc:
                updates['total_columns'] = doc.get('columns', 0)
            if 'file_size' not in doc:
                updates['file_size'] = doc.get('size', 0)
            if 'uploaded_at' not in doc:
                updates['uploaded_at'] = doc.get('created_at', timezone.now())
            if 'numeric_columns_count' not in doc:
                updates['numeric_columns_count'] = 0
            if 'categorical_columns_count' not in doc:
                updates['categorical_columns_count'] = 0
            if 'missing_values_count' not in doc:
                updates['missing_values_count'] = 0
            if 'duplicate_rows_count' not in doc:
                updates['duplicate_rows_count'] = 0
            if 'memory_usage' not in doc:
                updates['memory_usage'] = 0

            if updates:
                datasets_col.update_one({'_id': doc['_id']}, {'$set': updates})
                fixed += 1

        self.stdout.write(f"\nFixed {fixed} dataset(s), deleted {deleted} stale record(s).")

        # Update counter
        all_ds = list(datasets_col.find({}, {'id': 1}))
        ids = [d['id'] for d in all_ds if d.get('id')]
        if ids:
            max_id = max(ids)
            counters = get_collection('counters')
            counters.update_one({'_id': 'datasets'}, {'$set': {'seq': max_id}}, upsert=True)
            self.stdout.write(f"Updated datasets counter to {max_id}")

        # Verify remaining
        remaining = list(datasets_col.find({}, {'_id': 0, 'id': 1, 'user_id': 1, 'original_filename': 1, 'file_path': 1}))
        self.stdout.write(f"\nRemaining {len(remaining)} valid dataset(s):")
        for d in remaining:
            self.stdout.write(f"  id={d.get('id')}, user={d.get('user_id')}, file={d.get('original_filename')}")

        self.stdout.write(self.style.SUCCESS('\nDone!'))
