---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Renaming internal TypeSpec ARM foundation model names to be consistent with ARM common-type definitions.
However, these are `Azure.Resource.Manager.Foundations` models that would not normally be used directly in service specs.

- Deprecate `Foundations.ArmResource`. `Foundations.Resource` should be used instead.

- Deprecate `Foundations.ResourceSkuType`. `Foundations.Sku` should be used instead.

- Deprecate `Foundations.ResourcePlanType`. `Foundations.Plan` should be used instead.

- Deprecate `Foundations.TrackedResourceBase`. `Foundations.TrackedResource` should be used instead.

- Deprecate `Foundations.ProxyResourceBase`. `Foundations.ProxyResource` should be used instead.

- Deprecate `Foundations.ExtensionResourceBase`. `Foundations.ExtensionResource` should be used instead.
