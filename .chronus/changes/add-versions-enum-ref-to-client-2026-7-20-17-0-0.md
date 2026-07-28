---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `versionsEnum` field to `SdkClientType` providing a direct reference from each client to its Versions enum. This enables code generators to properly map clients to their version enums, especially for mixed api-version scenarios.
