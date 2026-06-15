import os
import re
import glob

BASE_DIR = '/home/madhan/Desktop/nexus/saas_version/nexus_backend'

# 1. Database to SQLite
db_path = os.path.join(BASE_DIR, 'core/settings/database.py')
with open(db_path, 'w') as f:
    f.write("""from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
""")

# 2. Cache to LocalMem
cache_path = os.path.join(BASE_DIR, 'core/settings/cache.py')
with open(cache_path, 'w') as f:
    f.write("""CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}
""")

# 3. Disable Celery Settings
celery_set_path = os.path.join(BASE_DIR, 'core/settings/celery.py')
with open(celery_set_path, 'w') as f:
    f.write("# Celery removed\n")

# 4. Modify base.py
base_path = os.path.join(BASE_DIR, 'core/settings/base.py')
with open(base_path, 'r') as f:
    base_content = f.read()
base_content = re.sub(r'"django_celery_beat",\s*', '', base_content)
base_content = re.sub(r'"django_celery_results",\s*', '', base_content)
base_content = base_content.replace(
    '"apps.common.authentication.KeycloakAuthentication",',
    '"rest_framework_simplejwt.authentication.JWTAuthentication",'
)
with open(base_path, 'w') as f:
    f.write(base_content)

# 5. Remove Celery .delay() calls
for root, dirs, files in os.walk(os.path.join(BASE_DIR, 'apps')):
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            if '.delay(' in content:
                content = content.replace('.delay(', '(')
                with open(filepath, 'w') as f:
                    f.write(content)

# 6. Auth URLs - redirect to SimpleJWT
auth_urls_path = os.path.join(BASE_DIR, 'apps/accounts/urls.py')
with open(auth_urls_path, 'r') as f:
    auth_content = f.read()

auth_content = "from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView\n" + auth_content
auth_content = auth_content.replace('TokenView.as_view()', 'TokenObtainPairView.as_view()')
auth_content = auth_content.replace('TokenRefreshView.as_view()', 'TokenRefreshView.as_view()') # The import name is the same, so we just remove the old import if we can

# We need to remove the local import of TokenView
auth_content = re.sub(r'TokenView,\s*', '', auth_content)
with open(auth_urls_path, 'w') as f:
    f.write(auth_content)

print("Backend dependencies replaced successfully.")
