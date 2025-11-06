---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Added experimental decorators to namespace `Azure.Core.Experimental` for mutative updates to types. These decorators are dangerous and may be removed at any time, so they automatically trigger a warning diagnostic that requires a suppression.