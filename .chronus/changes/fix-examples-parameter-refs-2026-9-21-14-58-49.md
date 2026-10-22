---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-examples"
---

Resolve local and external Swagger parameter references before migrating request locations, preserving path parameters and each API version's body names. Report missing or circular references explicitly.

Preserve request and response payload field order during migration and legacy expansion. Retain a version-specific variant when only field order changes instead of reusing an earlier version's ordering.