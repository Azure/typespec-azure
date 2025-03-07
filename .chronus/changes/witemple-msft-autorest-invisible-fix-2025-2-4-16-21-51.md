---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fixed a bug causing properties marked `@invisible(Lifecycle)` to remain included in payloads."