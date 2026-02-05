---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

The `apiVersion` parameter in client initialization is now correctly marked as `optional: true` for all client-level API version parameters, including both single-service and multi-service scenarios.
