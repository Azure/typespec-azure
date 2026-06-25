---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix false positive `override-parameters-mismatch` diagnostic for `@override` when the override operation adds, removes, or regroups parameters. Override parameters are now matched to the original operation's parameters by name instead of by sorted position, so an added parameter no longer shifts the remaining parameters out of alignment.
