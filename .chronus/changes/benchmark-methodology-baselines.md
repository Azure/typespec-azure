---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-website"
---

Compare benchmark results only against runs using the same sampling method, avoiding misleading performance changes when switching from combined compilation/emission to independent measurements.
