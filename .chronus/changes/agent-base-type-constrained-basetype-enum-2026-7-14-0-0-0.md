---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Constrain the `baseType` field of the experimental `BaseTypeInfo` to a new `BaseType` extensible enum (a union of `Agent` and `Relationship` with a `string` variant) instead of a free-form `string`, following the Azure `no-enum` / `no-closed-literal-union` conventions.
