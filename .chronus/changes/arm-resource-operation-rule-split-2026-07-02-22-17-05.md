---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Split `arm-resource-operation` lint rule: add `arm-resource-operation-missing-decorator` and `arm-resource-operation-missing-api-version` as separate rules. The original rule now only checks that operations are inside an interface declaration.
