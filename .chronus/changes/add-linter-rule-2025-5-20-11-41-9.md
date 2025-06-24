---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Added a linter rule to warn when a `@Azure.ResourceManager.Legacy.customAzureResource` does not contain a `@key` property, as this can cause duplicate operations.
