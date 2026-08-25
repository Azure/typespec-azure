---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Make the `scope` argument accepted by scoped TCGC decorators evolvable. Introduces a shared `Azure.ClientGenerator.Core.ScopeOptions` model and `Scope` alias (`ScopeOptions | string`), so every scoped decorator now accepts either the legacy plain-string scope (e.g. `"csharp"`, `"!(java, python)"`) or a typed options bag (e.g. `#{ scope: "csharp" }`). Individual decorators can later grow their own options model that extends `ScopeOptions` without breaking other decorators still using the shared alias. Scope normalization is now centralized in a single helper used by all decorator implementations.

Also as part of this change:

- `@client`'s `ClientOptions` now accepts `scope` directly; the legacy third positional `scope` argument is still supported, and a new `conflicting-scope` diagnostic is reported if both are set to different values.
- A new `invalid-scope` diagnostic is reported for malformed scope strings (empty, whitespace-only, empty grouped negation, or empty comma-list entries), whether provided as a legacy string or through the options bag.
- A new `scope-options-migration` linter rule (enabled by default, warning severity) flags legacy positional string scope arguments and offers a code fix to convert them to the typed options bag. Migration is optional; both forms remain fully supported.
- See `design-docs/scope-options-migration.md` for the deprecation policy (none currently planned) and migration guidance.

