---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add new linting rule `arm-no-replace-inherited-props` that warns when a model redefines a property that is already defined in one of its base models. The 'name' property of an ARM resource and properties redefined as part of a model marked with `@discriminator` are not flagged by this rule.
