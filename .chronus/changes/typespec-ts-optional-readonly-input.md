---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Make read-only properties optional on shared request models, including nested and inline models, while preserving required response-only and visibility-split properties.
