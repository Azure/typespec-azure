---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix regression with @clientOption negation scope handling. Decorators using negation scope patterns like '!python' or '!(java, python)' are now correctly filtered.
