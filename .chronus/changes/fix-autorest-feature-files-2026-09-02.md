---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

Do not emit empty legacy feature files, apply `version-enum-strategy` to feature enums, and return the configured enum from the ARM feature-file accessor.
