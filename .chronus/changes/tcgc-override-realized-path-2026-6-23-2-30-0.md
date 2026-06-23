---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix false positive `override-parameters-mismatch` diagnostic for `@override` when a parameter carries the `@path` decorator in the type graph (for example an ARM scope model property) but is not realized as a path parameter in the operation's actual route.
