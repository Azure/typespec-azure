---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Make the `scope` argument accepted by scoped TCGC decorators evolvable. Introduces a shared `Azure.ClientGenerator.Core.ScopeOptions` model and `Scope` alias (`ScopeOptions | string`), so every scoped decorator now accepts either the legacy plain-string scope (e.g. `"csharp"`, `"!(java, python)"`) or a typed options bag (e.g. `#{ scope: "csharp" }`). Individual decorators can later grow their own options model that extends `ScopeOptions` without breaking other decorators still using the shared alias. Scope normalization is now centralized in a single helper used by all decorator implementations.
