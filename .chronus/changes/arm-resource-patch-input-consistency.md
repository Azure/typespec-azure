---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-patch` to compare effective PUT and PATCH input properties using native JSON names, request visibility and version availability. Preserve recursive, missing and empty PATCH-body safeguards without adding a separately configured rule.
