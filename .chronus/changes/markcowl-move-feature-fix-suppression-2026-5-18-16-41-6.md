---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-autorest"
---

Move `@feature`, `@features`, and `@featureOptions` decorators from `Azure.ResourceManager.Legacy` to `Azure.ResourceManager` namespace. Propagate `arm-custom-resource-usage-discourage` suppressions from custom resource templates to their instantiations.