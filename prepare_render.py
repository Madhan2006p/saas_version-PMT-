import os
import re
import shutil

BASE_DIR = '/home/madhan/Desktop/nexus/saas_version'
BACKEND_DIR = os.path.join(BASE_DIR, 'nexus_backend')
FRONTEND_DIR = os.path.join(BASE_DIR, 'nexus_frontend')

# 1. Remove Docker files
for f in ['docker-compose.yml', 'nexus_backend/Dockerfile', 'nexus_frontend/Dockerfile', 'keycloak-import']:
    path = os.path.join(BASE_DIR, f)
    if os.path.exists(path):
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)

# 2. Mock Authentication in Backend
mock_auth_path = os.path.join(BACKEND_DIR, 'apps/common/authentication.py')
with open(mock_auth_path, 'w') as f:
    f.write("""from rest_framework import authentication
from apps.accounts.models import Employee

class MockAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        try:
            user = Employee.objects.get(employee_code='HIT-001')
            return (user, None)
        except Employee.DoesNotExist:
            return None
""")

# Update REST_FRAMEWORK settings
settings_path = os.path.join(BACKEND_DIR, 'core/settings/base.py')
with open(settings_path, 'r') as f:
    content = f.read()

# Replace JWT Authentication with Mock Authentication
content = re.sub(r'"rest_framework_simplejwt.authentication.JWTAuthentication",', '"apps.common.authentication.MockAuthentication",', content)
content = re.sub(r'"apps.common.authentication.KeycloakAuthentication",', '"apps.common.authentication.MockAuthentication",', content)

# Change IsAuthenticated to AllowAny just in case
content = re.sub(r'"apps.common.permissions.IsAuthenticated",', '"rest_framework.permissions.AllowAny",', content)

with open(settings_path, 'w') as f:
    f.write(content)

# 3. Create build.sh for Render
build_sh_path = os.path.join(BACKEND_DIR, 'build.sh')
with open(build_sh_path, 'w') as f:
    f.write("""#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py seed_demo_data --skip-keycloak --skip-permissions
""")
os.chmod(build_sh_path, 0o755)

# 4. Create render.yaml
render_yaml_path = os.path.join(BASE_DIR, 'render.yaml')
with open(render_yaml_path, 'w') as f:
    f.write("""services:
  - type: web
    name: pmt-backend
    env: python
    rootDir: nexus_backend
    buildCommand: "./build.sh"
    startCommand: "gunicorn core.wsgi:application"
    envVars:
      - key: DEBUG
        value: "False"
      - key: ALLOWED_HOSTS
        value: "*"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://pmt-frontend.onrender.com"

  - type: web
    name: pmt-frontend
    env: static
    rootDir: nexus_frontend
    buildCommand: "npm install && npm run build"
    staticPublishPath: "./dist"
    envVars:
      - key: VITE_API_BASE_URL
        value: "https://pmt-backend.onrender.com/pmt/api/v1"
""")

print("Render preparation complete.")
