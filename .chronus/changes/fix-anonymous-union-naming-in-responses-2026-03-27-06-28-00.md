---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix synthetic union created from split HTTP union responses not getting generated name and creating union-of-union when there are more than 2 response types.
