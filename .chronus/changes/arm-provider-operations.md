---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `@providerOperation`, `getProviderOperation`, `isProviderOperation`, and `isResourceOperation`. Register standard provider templates and add the opt-in `provider-or-resource-operation` ARM lint rule to detect missing or mixed provider/resource registrations, with specific diagnostics for unregistered resource models and resource operations outside interfaces.

Allow repeated resource-operation registrations to override logical grouping without duplicate operation entries. Add the suppressible `no-resource-operation-conflict` warning for inconsistent resource models or ARM operation kinds on the original type graph without treating versioning replay as a conflict. The latest decorator execution wins when operation kinds differ. Resource actions can use `@get` and `@list` without being registered as ARM resource lists. Both lint rules are disabled by default in the central `resource-manager` ruleset.
