import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from packages.keycloak.services import KeycloakService
try:
    svc = KeycloakService()
    print("Token fetched. Getting permissions...")
    roles = svc.get_permissions()
    print("Roles fetched:", len(roles))
except Exception as e:
    import traceback
    traceback.print_exc()
