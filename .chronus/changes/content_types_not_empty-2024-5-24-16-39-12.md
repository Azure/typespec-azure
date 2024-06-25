---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

don't let optional `.contentTypes` on response body be empty. If it's empty, just set it to undefined