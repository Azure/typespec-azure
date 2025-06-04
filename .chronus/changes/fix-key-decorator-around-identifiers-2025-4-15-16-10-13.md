---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `@key` decorator resolution for `x-ms-identifiers`: when `@key` is applied to a property named `id` or `name`, it will no longer add an identifier.
