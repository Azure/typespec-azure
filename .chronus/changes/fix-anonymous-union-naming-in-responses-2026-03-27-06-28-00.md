---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix anonymous unions in models referenced in union/@event decorator not getting generated names. The synthetic union created from split HTTP responses now gets a proper generated name and avoids creating union-of-union when there are more than 2 response types.
