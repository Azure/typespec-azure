---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix @apiVersion(false) decorator being ignored by isOnClient() logic when other operations have api-version elevated to client