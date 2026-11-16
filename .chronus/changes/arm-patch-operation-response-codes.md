---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the opt-in `arm-patch-operation-response-codes` rule for ARM PATCH response sets and 202 response bodies. The rule uses Azure Core LRO metadata and is disabled in the central `resource-manager` ruleset.
