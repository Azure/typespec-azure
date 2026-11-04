---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-patch` to require nonempty PATCH input whose writable JSON property names are present in the corresponding PUT input, including inherited and nested properties. Covers `PatchPropertiesCorrespondToPutProperties` using source models; historical API-version shapes are not evaluated.
