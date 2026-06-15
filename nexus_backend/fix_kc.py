import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.conf import settings
from keycloak import KeycloakAdmin

master_admin = KeycloakAdmin(
    server_url=settings.KEYCLOAK_SERVER_URL,
    realm_name="pmt",
    user_realm_name="master",
    client_id="admin-cli",
    username="admin",
    password="admin",
    verify=True,
)

clients = master_admin.get_clients()
pmt_backend = next(c for c in clients if c['clientId'] == 'pmt-backend')
client_id = pmt_backend['id']

sa_user = master_admin.get_client_service_account_user(client_id)
user_id = sa_user['id']

realm_management = next(c for c in clients if c['clientId'] == 'realm-management')
rm_client_id = realm_management['id']

rm_roles = master_admin.get_client_roles(rm_client_id)
roles_to_add = [r for r in rm_roles if r['name'] in ['manage-realm', 'view-realm', 'manage-users', 'view-users']]

master_admin.assign_client_role(
    client_id=rm_client_id,
    user_id=user_id,
    roles=roles_to_add,
)
print("Roles assigned successfully!")
