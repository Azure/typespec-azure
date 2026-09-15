---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule to report required, default-valued, and create-only properties emitted in PATCH request bodies.

When enabled, the rule applies ARM PATCH guidance throughout the compilation, including nested namespaces and interfaces, without requiring `@armProviderNamespace`.
