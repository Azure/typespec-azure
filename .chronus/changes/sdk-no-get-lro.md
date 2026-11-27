---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `no-get-lro` to warn when a GET operation is marked as long-running with `Legacy.markAsLro` in any language scope. Remove an erroneous marker or suppress the rule for an approved existing API compatibility exception.

This covers accepted Legacy-marker cases of the Swagger linter `GetOperationMustNotBeLongRunning`. Native LRO metadata without an accepted Legacy marker is outside this rule.
