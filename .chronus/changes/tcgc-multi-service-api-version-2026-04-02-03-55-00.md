---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Multi services' client should not honor the specific `api-version` set in config. The `api-version` config value is now cleared when dealing with multi-service clients during the versioning mutation and cache steps.
