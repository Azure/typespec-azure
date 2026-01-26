---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix subscriptionId and apiVersion client parameters not propagating to top-level client when nested operation groups contain these parameters