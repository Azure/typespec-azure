---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Enhance `@Azure.ClientGenerator.Core.Legacy.hierarchyBuilding` to support arbitrary inheritance replacement. The decorator no longer requires the target to be a property-superset of the new base; properties contributed by removed intermediate parents are lifted onto the target so the SDK model preserves its observable property set.
