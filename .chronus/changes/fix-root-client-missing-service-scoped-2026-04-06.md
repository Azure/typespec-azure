---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `root-client-missing-service` diagnostic incorrectly firing for scoped `@client` definitions with `@operationGroup` sub-clients.
