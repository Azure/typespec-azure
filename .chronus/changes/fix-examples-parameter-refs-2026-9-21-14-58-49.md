---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-examples"
---

Resolve local and external Swagger parameter references before migrating request locations, preserving path parameters and each API version's body names. Report missing or circular references explicitly.