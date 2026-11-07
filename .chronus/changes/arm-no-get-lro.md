---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `no-get-lro` to prevent GET operations with native LRO metadata, including customized templates and polling/result endpoints. This provides native protocol guidance related to the Swagger linter `GetOperationMustNotBeLongRunning`; Legacy-only SDK declarations are not checked.
