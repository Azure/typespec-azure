---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Emits all path parameters as required even if optional in TypeSpec. Reports a new warning if an optional path parameter is found: `@azure-tools/typespec-autorest/unsupported-optional-path-param`.
