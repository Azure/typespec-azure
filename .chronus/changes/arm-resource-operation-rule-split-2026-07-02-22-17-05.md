---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Split `arm-resource-operation` lint rule: add `use-operation-decorator` and `use-api-version` as separate rules. The original rule now only checks that operations are inside an interface declaration.
