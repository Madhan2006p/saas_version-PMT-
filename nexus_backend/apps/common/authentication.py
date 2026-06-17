from rest_framework import authentication
from apps.accounts.models import Employee

class MockAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        try:
            user = Employee.objects.get(employee_code='HIT-001')
        except Employee.DoesNotExist:
            user = Employee(
                employee_code='HIT-001',
                username='HIT-001',
                full_name='Mock CEO User',
                is_superuser=True,
                is_pmo=True,
                is_manager=True
            )
            # Give it a fake ID so serialization doesn't crash
            import uuid
            user.id = uuid.uuid4()
        return (user, None)
