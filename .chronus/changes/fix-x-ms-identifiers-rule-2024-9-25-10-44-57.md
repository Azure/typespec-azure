---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the `x-ms-identifier` rule. The `x-ms-identifier` supports indexing into inner properties, but the linter does not support that and reports a warning.
