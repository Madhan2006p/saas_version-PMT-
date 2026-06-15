import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.conf import settings
from keycloak import KeycloakAdmin
admin = KeycloakAdmin(
    server_url=settings.KEYCLOAK_SERVER_URL,
    realm_name=settings.KEYCLOAK_REALM,
    client_id=settings.KEYCLOAK_CLIENT_ID,
    client_secret_key=settings.KEYCLOAK_CLIENT_SECRET_KEY,
    verify=True,
)
users = admin.get_users({})
for u in users:
    if u['username'] in ('HIT-001', 'HIT-002', 'HIT-004', 'HIT-008'):
        admin.set_user_password(u['id'], 'password123', temporary=False)
        print(f"Reset password for {u['username']} to password123")
