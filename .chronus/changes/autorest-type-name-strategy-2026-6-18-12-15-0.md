---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Add `type-name-strategy` emitter option to control how OpenAPI names are derived from TypeSpec types. The new `"name-only"` strategy removes the namespace prefix from names (e.g. `Foo` instead of `LiftrBase.Foo`), matching the names used by client emitters. The default `"namespaced"` keeps the current behavior. When two types collapse to the same name, a `duplicate-type-name` error is reported.

```yaml
options:
  "@azure-tools/typespec-autorest":
    type-name-strategy: "name-only"
```
