---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `use-scope-for-extension-routing` for RPaaS extension-routing contracts. The rule requires arbitrary-scope paths rather than hardcoded parent paths and is included in the ARM library's `all` ruleset. Specific-parent extension paths remain supported for ordinary ARM contracts.
