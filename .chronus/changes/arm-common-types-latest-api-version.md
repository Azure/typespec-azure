---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Require the latest ARM common-types selection with `@armCommonTypesVersion` only on the latest API version of a versioned service, preserving historical selections and missing-configuration checks. Unversioned ARM services must explicitly select the latest common-types version.
