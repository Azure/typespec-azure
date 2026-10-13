---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `use-scope-for-extension-routing` for explicitly opted-in RPaaS extension-routing contracts. The rule requires arbitrary-scope paths rather than hardcoded parent paths; ordinary ARM specific-parent endpoints remain supported by default.
