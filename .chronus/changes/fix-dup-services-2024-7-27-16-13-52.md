---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fixes bug where defining multiple services in a project resulted in each openapi output containing the same single service definition.