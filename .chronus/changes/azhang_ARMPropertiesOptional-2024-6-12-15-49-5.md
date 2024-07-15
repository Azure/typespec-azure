---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Added an optional template parameter on `TrackedResource`, `ProxyResource`, and `ExtensionResource` ARM templates that allows brownfield services to customize the optionality of the ARM resource `properties` field.
