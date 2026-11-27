---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule to check PATCH resource-property layout, immutable ARM fields, lifecycle-defined update restrictions, optionality, defaults, and update visibility. Required fields in replacement array elements are allowed, and top-level `identity` is exempt from optionality, default, and resource/input visibility checks.

Migrates checks from `ConsistentPatchProperties`, `UnSupportedPatchProperties`, and `PatchBodyParametersSchema`.
