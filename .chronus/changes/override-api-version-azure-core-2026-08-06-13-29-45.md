---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Add the legacy `@Azure.Core.Legacy.overrideApiVersion` decorator for overriding inherited
API-version wire defaults on namespaces and interfaces.

```typespec
@Azure.Core.Legacy.overrideApiVersion("2021-11-01")
interface Widgets {
  get(): void;
}
```
