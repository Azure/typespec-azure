---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Allow for responses without bodies to be errors, depending on presence of `@error` decorator