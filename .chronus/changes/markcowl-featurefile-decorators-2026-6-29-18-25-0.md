---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `@featureFile`, `@featureFiles`, and `@featureFileOptions` decorators in `Azure.ResourceManager` namespace as alternatives to the Legacy `@feature`, `@features`, and `@featureOptions` decorators. Add `arm-feature-file-usage-discourage` linting rule. Fix `arm-custom-resource-usage-discourage` rule to propagate suppressions from model templates to their instantiations.
