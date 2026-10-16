---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add the opt-in `use-delete-for-delete` lint rule requiring common SDK method names of concrete HTTP DELETE endpoints to start with `delete`, honoring unscoped client names and the supported friendly-name fallback.
