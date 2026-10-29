---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the opt-in `no-nested-system-data` lint rule to keep system data in the ARM resource envelope rather than inside properties bags, including inherited dictionary values and discriminated payload alternatives.
