---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Keep the complete resource result for resource create-or-replace LROs without retaining an incompatible polling-property extraction path in `getLroMetadata`.
