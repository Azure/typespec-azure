---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-redundant-client-name` to report property and parameter `@clientName` overrides that leave SDK spelling and exact-name policy unchanged.

Keep the rule disabled in the `data-plane`, `resource-manager`, and `client-sdk` policy presets.
