---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

The `service` property in `SdkOperationGroup` and `SdkClient` is now deprecated. Use the new `services` property instead, which supports multiple services. The deprecated `service` property will return `services[0]` for single service scenarios or the full `services` array for multi-service scenarios. This property will be removed in a future release.
