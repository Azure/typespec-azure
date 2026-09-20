---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule to report required, default-valued, and create-only properties in effective PATCH request input.

When enabled, the rule applies ARM PATCH guidance throughout the compilation, including nested namespaces and interfaces, without requiring `@armProviderNamespace`.

Property checks apply to single HTTP bodies, excluding multipart wrappers and file payloads.

Request visibility governs both input membership and optionality. Excluded properties are not checked, and absent or optional discriminators are not made required by emitter behavior.
