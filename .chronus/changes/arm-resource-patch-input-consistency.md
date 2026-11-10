---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-patch` to require nonempty PATCH input whose writable JSON properties have compatible types and constraints in the corresponding PUT input, including inherited operations and inherited and nested properties. Match object containers without Update-visible children to the PUT input at the same JSON position. Check scalar encodings, enum values, array and dictionary contents, string lengths, item counts and numeric bounds while permitting partial updates and explicit property resets. Covers `PatchPropertiesCorrespondToPutProperties` using source models; historical API-version shapes are not evaluated.
