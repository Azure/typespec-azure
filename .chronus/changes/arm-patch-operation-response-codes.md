---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `arm-patch-operation-response-codes` rule for ARM PATCH response sets and 202 response bodies. The rule uses Azure Core LRO metadata.

The rule is disabled by default in the `@azure-tools/typespec-azure-rulesets/resource-manager` ruleset and can be enabled explicitly. It is enabled in the `@azure-tools/typespec-azure-resource-manager/all` ruleset.
