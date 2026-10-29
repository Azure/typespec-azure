---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Consolidate `use-create-for-put`, PATCH naming guidance, and DELETE naming guidance into the opt-in `use-correct-verb` lint rule. Common SDK method names must start with `create` for PUT, `update` for PATCH, and `delete` for DELETE, case-insensitively. Replace `use-create-for-put` in linter configuration and suppressions with `use-correct-verb`; enabling it also checks PATCH and DELETE. Renaming an already-shipped SDK method may be a breaking change.
