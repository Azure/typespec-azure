---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

`service` in `SdkOperationGroup` and `SdkClient` has been removed. Replaced with `services` to support multiple services scenario.