---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

We no longer filter out core models. The `filter-out-core-models` parameter to `SdkContext` is also removed
