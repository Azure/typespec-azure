---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Consolidated `SdkOperationGroup` into `SdkClient`. The `SdkOperationGroup` interface has been removed. All operation groups are now represented as `SdkClient` instances.

**Migration Guide:**

- Replace all references to `SdkOperationGroup` with `SdkClient`
- Replace `subOperationGroups` with `subClients`
- Replace `groupPath` with `clientPath`
- Replace `SdkClient.service` (removed) with `SdkClient.services` (array of namespaces)
- Replace `listOperationGroups()` with `listSubClients()`
- Replace `listOperationsInOperationGroup()` with `listOperationsInClient()`
- Replace `isOperationGroup()` / `getOperationGroup()` — use `getClient()` and check `parent` instead
