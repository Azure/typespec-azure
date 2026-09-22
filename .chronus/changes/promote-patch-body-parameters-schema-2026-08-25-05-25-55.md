---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule, consolidating resource-layout, immutable-field, and partial-update safety checks in one PATCH-body traversal.

Report missing or misnested resource properties, writable immutable fields, required or default-valued input, and exposed input lacking Update visibility. Prefer associated resource metadata, with PATCH and same-path GET response fallbacks.

When enabled, the rule applies ARM PATCH guidance throughout the compilation, including nested namespaces and interfaces, without requiring `@armProviderNamespace`.

Property checks apply to single HTTP bodies, excluding multipart wrappers and file payloads. Array replacement elements may contain required properties, but their defaults, visibility, and resource layout remain checked. Top-level encoded identity retains its safety exemption without bypassing resource-layout checks.

Request visibility governs both input membership and optionality. Excluded properties are not checked, and absent or optional discriminators are not made required by emitter behavior.

Keep `arm-resource-patch`, `patch-envelope`, and PATCH-to-PUT correspondence separate. The shared resource-manager ruleset registration remains disabled.
