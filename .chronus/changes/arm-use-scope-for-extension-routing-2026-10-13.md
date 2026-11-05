---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the opt-in `use-scope-for-extension-routing` rule for managed RPaaS extension-routing contracts. The rule requires arbitrary-scope paths rather than hardcoded parent paths. ARM library `all` does not enable this RPaaS-specific policy; specific-parent extension paths remain supported for ordinary ARM contracts.
