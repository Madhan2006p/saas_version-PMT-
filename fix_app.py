import re

app_path = '/home/madhan/Desktop/nexus/saas_version/nexus_frontend/src/App.tsx'
with open(app_path, 'r') as f:
    content = f.read()

# Force token in RequireAuth
replacement = """function RequireAuth({ children }: { children: React.ReactNode }) {
  const token       = "dummy-token"; // Force token
  const user        = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const setUser     = useAuthStore((s) => s.setUser);
  const setPerms    = useAuthStore((s) => s.setPermissions);"""

content = re.sub(r'function RequireAuth.*?const setPerms\s*=\s*useAuthStore\(\(s\) => s.setPermissions\);', replacement, content, flags=re.DOTALL)

with open(app_path, 'w') as f:
    f.write(content)
