---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Make the `scope` argument accepted by scoped TCGC decorators evolvable via a shared, typed `Azure.ClientGenerator.Core.DecoratorOptions` model. Every scoped decorator now accepts either the legacy plain-string scope (e.g. `"csharp"`) or a typed options bag (e.g. `#{ scope: "csharp" }`), and individual decorators can later grow their own options model that extends `DecoratorOptions` without breaking others.

`@client`'s `ClientOptions` and `@clientInitialization`'s `ClientInitializationOptions` now also accept `scope` directly (both extend `DecoratorOptions`). If the options bag scope disagrees with the legacy positional argument, TCGC reports a `conflicting-scope` warning and prefers the options bag value. Decorators that already have an options bag keep a single options bag — the legacy positional `scope` stays a plain string purely for backward compatibility. See `design-docs/decorator-options-migration.md` for migration guidance and deprecation policy.
