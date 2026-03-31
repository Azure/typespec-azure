---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Synthetic content type and accept parameters now honor HTTP library's result directly. Single content type produces a constant, multiple content types produce an enum, for both File and non-File body types.
