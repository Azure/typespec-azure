---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix `x-ms-identifiers` being automatically populated, which caused default values to be overwritten unexpectedly. Now, it is only set when explicitly defined.
