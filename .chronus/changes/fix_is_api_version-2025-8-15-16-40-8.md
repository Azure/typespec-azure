---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Change `isApiVersion` logic. If a service is not versioning, the function always return false.