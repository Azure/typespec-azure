---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the Agent base type contract version in the `@azureBaseType` decorator on the `Agent` resource template, correcting a typo where it was set to `2024-06-01` instead of `2026-04-01`.
