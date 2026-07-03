---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Verify all path parameters are preserved in `@override` customizations. The check now resolves the original operation's realized HTTP route to determine its path parameters, instead of relying on the `@path` decorator in the type graph. This correctly handles parameters that carry `@path` but are not part of the realized route (for example an ARM key surfaced by a templated provider action) as well as `@path` parameters nested inside a plain model or `@bodyRoot`. The corresponding override parameter is matched by name rather than position so overrides that add or reorder parameters no longer produce false `override-parameters-mismatch` diagnostics.