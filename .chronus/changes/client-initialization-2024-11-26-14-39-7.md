---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

`getClientInitialization` now return `ClientInitializationOptions` types. It includes the info of the client initialization parameter list, the client initialization access value and the client accessor access value.