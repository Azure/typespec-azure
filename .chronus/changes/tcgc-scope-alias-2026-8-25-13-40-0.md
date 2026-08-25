---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Make the `scope` argument accepted by scoped TCGC decorators evolvable via a shared, typed `Azure.ClientGenerator.Core.ScopeOptions` model and `Scope` alias (`ScopeOptions | string`). Every scoped decorator now accepts either the legacy plain-string scope (e.g. `"csharp"`) or a typed options bag (e.g. `#{ scope: "csharp" }`), and individual decorators can later grow their own options model that extends `ScopeOptions` without breaking others.

`@client`'s `ClientOptions` now also accepts `scope` directly, with a new `conflicting-scope` diagnostic if it disagrees with the legacy positional argument, plus a new `invalid-scope` diagnostic for malformed scope strings. See `design-docs/scope-options-migration.md` for migration guidance and deprecation policy.

