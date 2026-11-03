---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Add `no-get-lro` rules that prevent long-running GET operations. The ARM rule
reports native LROs, including customized templates and polling/result endpoints.
The TCGC rule reports accepted `Legacy.markAsLro` declarations on GET operations
in any SDK scope.

These rules provide native guidance related to the Swagger linter
`GetOperationMustNotBeLongRunning`.
