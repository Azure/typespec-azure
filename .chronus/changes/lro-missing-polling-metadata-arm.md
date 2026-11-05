---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `lro-missing-polling-metadata` lint rule, consolidating `LroExtension` and `XMSLongRunningOperationProperty`. Require native polling metadata for PATCH and marked provider/collection POST operations returning `202`, and for PUT/PATCH/POST/DELETE operations whose `200`, `201`, `202`, or `204` responses contain `Location` or `Azure-AsyncOperation` headers.

Use asynchronous ARM templates or preserve supported semantic LRO headers. Check concrete operations within explicit service namespaces, including nested namespaces, without a global fallback. Report once on the authored operation even when both checks apply, and resolve each eligible operation once across overlapping service declarations, including compliant operations.

The rule is disabled in the central resource-manager ruleset and included in the ARM library's compiler-generated `all` ruleset.
