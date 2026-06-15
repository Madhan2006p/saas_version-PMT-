from rest_framework import authentication
from apps.accounts.models import Employee

class MockAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        try:
            user = Employee.objects.get(employee_code='HIT-001')
            return (user, None)
        except Employee.DoesNotExist:
            return None
