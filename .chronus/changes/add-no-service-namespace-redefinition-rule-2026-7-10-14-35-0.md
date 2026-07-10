---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-service-namespace-redefinition` linter rule to prevent `client.tsp` from reopening the service namespace or its child namespaces. Enable the rule in the Azure data-plane and resource-manager rulesets.
