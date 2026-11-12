---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `@providerOperation`, `getProviderOperation`, `isProviderOperation`, and `isResourceOperation`. Register standard provider templates and add the opt-in `provider-or-resource-operation` ARM lint rule to detect operations missing provider or resource metadata, with specific diagnostics naming unregistered resource models and requiring resource operations to be defined inside an interface. The rule is disabled by default in the `resource-manager` ruleset.
