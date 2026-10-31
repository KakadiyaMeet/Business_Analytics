"""
Management command: repair_users
Normalizes all MongoDB user documents to the correct schema.

Fixes:
- Missing 'id' field (auto-generates one)
- 'hashed_password' → 'password'
- 'role' → 'is_staff'
- 'django_user_id' → 'id'
- Missing 'is_active' (defaults to True)
- Missing 'is_staff' (defaults to False)
- Users without passwords get a temporary one set

Usage:
    python manage.py repair_users
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from config.mongodb import get_collection, get_next_id


class Command(BaseCommand):
    help = 'Normalize all MongoDB user documents to the correct schema.'

    def handle(self, *args, **options):
        users_col = get_collection('users')
        all_users = list(users_col.find({}))

        self.stdout.write(f"Found {len(all_users)} user(s) in MongoDB.\n")

        for doc in all_users:
            updates = {}
            username = doc.get('username', '???')
            self.stdout.write(f"Checking user: {username}")

            # 1. Fix missing 'id'
            if not doc.get('id'):
                if doc.get('django_user_id'):
                    updates['id'] = doc['django_user_id']
                    self.stdout.write(f"  [FIX] id: None -> {doc['django_user_id']} (from django_user_id)")
                else:
                    new_id = get_next_id('users')
                    updates['id'] = new_id
                    self.stdout.write(f"  [FIX] id: None -> {new_id} (auto-generated)")

            # 2. Fix 'hashed_password' → 'password'
            if not doc.get('password') and doc.get('hashed_password'):
                updates['password'] = doc['hashed_password']
                self.stdout.write("  [FIX] password: copied from hashed_password")

            # 3. Fix empty/missing password — set a default temporary password
            if not doc.get('password') and not doc.get('hashed_password'):
                temp_pass = make_password('password123')
                updates['password'] = temp_pass
                self.stdout.write("  [FIX] password: SET TO 'password123' (CHANGE THIS!)")

            # 4. Fix missing is_active
            if 'is_active' not in doc or doc.get('is_active') is None:
                updates['is_active'] = True
                self.stdout.write("  [FIX] is_active: None -> True")

            # 5. Fix is_staff from role or default
            if 'is_staff' not in doc or doc.get('is_staff') is None:
                is_staff = doc.get('role', '') == 'admin'
                updates['is_staff'] = is_staff
                self.stdout.write(f"  [FIX] is_staff: None -> {is_staff}")

            # 6. Fix missing is_superuser
            if 'is_superuser' not in doc:
                updates['is_superuser'] = False
                self.stdout.write("  [FIX] is_superuser: missing -> False")

            # 7. Fix missing first_name/last_name
            if 'first_name' not in doc:
                updates['first_name'] = ''
            if 'last_name' not in doc:
                updates['last_name'] = ''

            # 8. Fix missing date_joined
            if not doc.get('date_joined'):
                date_joined = doc.get('created_at', timezone.now())
                updates['date_joined'] = date_joined
                self.stdout.write("  [FIX] date_joined: set")

            # Apply updates
            if updates:
                users_col.update_one({'_id': doc['_id']}, {'$set': updates})
                self.stdout.write(f"  [SAVED] {len(updates)} field(s) updated")
            else:
                self.stdout.write("  [OK] No fixes needed")
            self.stdout.write("")

        # Verify
        self.stdout.write("=" * 50)
        self.stdout.write("VERIFICATION")
        self.stdout.write("=" * 50)
        for doc in users_col.find({}, {'_id': 0, 'password': 0}):
            self.stdout.write(
                f"  {doc.get('username')}: id={doc.get('id')}, "
                f"active={doc.get('is_active')}, staff={doc.get('is_staff')}"
            )

        self.stdout.write(self.style.SUCCESS('\nDone!'))
