---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `use-standard-response-codes` to validate ARM PATCH response codes and require an empty `202` body for long-running PATCH operations. The rule remains disabled in the resource-manager ruleset.
