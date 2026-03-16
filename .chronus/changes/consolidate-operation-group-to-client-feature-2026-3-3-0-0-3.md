---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added multi-service client support with `autoMergeService` property on `@client` decorator. The `service` property now accepts an array of services (e.g., `service: [ServiceA, ServiceB]`). When `autoMergeService: true`, all services' operations and sub clients are auto-merged into the client. Supports advanced scenarios including services as direct children (nested `@client` with `autoMergeService: true` on children) and fully customized client hierarchies using explicit `is` operation mapping.
