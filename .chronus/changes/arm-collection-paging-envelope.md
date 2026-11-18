---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Merge `list-operation-missing-pageable` into `list-response-envelope`, checking collection paging metadata and response envelopes together. Replace configurations and suppressions for the retired rule ID with `list-response-envelope`; the combined rule remains disabled in the resource-manager preset.
