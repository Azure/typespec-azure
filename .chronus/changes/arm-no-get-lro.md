---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `no-get-lro` to warn about GET operations that use a native long-running protocol, including polling and result endpoints. This provides native TypeSpec guidance related to the Swagger linter `GetOperationMustNotBeLongRunning`; Legacy-only SDK declarations are not checked.
