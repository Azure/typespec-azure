---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix sorting of x-ms-paths entries that start with `?` (query-only paths). Previously these paths were not sorted alphabetically.
