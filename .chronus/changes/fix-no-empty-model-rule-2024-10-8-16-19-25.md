---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the `no-empty-model` rule to prevent it from being triggered for Records, as this is already covered by another rule.
