---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `arm-resource-interface-requires-decorator` linting rule to use TypeSpec decorator definition name instead of JS function name, preventing false positives in minified playground bundles
