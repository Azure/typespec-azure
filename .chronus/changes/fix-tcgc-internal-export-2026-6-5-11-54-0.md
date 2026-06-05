---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Move internal `EXACT_NAME_PREFIX` constant out of public exports to fix build failures when `skipLibCheck` is disabled.
