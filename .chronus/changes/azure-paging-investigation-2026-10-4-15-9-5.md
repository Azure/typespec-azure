---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
---

Consolidate warnings for `@continuationToken` usage under `list-response-envelope`. The shared Azure Core policy recommends `@nextLink` pagination, including for paired tokens, and the ARM rule combines that policy with its existing response-envelope checks.