---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule, consolidating resource-layout, immutable-field, and partial-update safety checks in one PATCH-body traversal.

Report missing or incorrectly nested resource properties, writable immutable fields, required or default-valued input, and exposed input lacking Update visibility. Prefer associated resource metadata, with PATCH and same-path GET response fallbacks.

When enabled, the rule applies ARM PATCH guidance throughout the compilation, including nested namespaces and interfaces, without requiring `@armProviderNamespace`.

Property checks apply to single HTTP bodies, excluding multipart wrappers and file payloads. Array replacement elements may contain required properties, but their defaults, visibility, and resource layout remain checked. Top-level encoded identity retains its safety exemption without bypassing resource-layout checks.

Skip descendant layout comparison for present unsupported resource unions without expanding their alternatives. Retain required/default/visibility/immutable safety checks, genuinely missing-property diagnostics, and supported single-model or nullable layout comparisons.

Request visibility governs both input membership and optionality. Excluded properties are not checked, and absent or optional discriminators are not made required by emitter behavior.

Respect effective payload properties, write-only resource members, and arbitrary keys permitted by resource records. Keep definite layout errors across equally preferred response entries and shared-route GETs, and support namespace-local GET fallback without service metadata. Exclude inherited native File members without exempting authored JSON overrides, and check concrete endpoints without duplicate template-instance warnings.

Keep `arm-resource-patch`, `patch-envelope`, and PATCH-to-PUT correspondence separate. The shared resource-manager ruleset registration remains disabled.
