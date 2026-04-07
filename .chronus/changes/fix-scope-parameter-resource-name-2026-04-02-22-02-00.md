---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix default resource name for extension resources using `Extension.ScopeParameter` scope. Previously the name was incorrectly prefixed with "ScopeParameter", now it uses just the extension resource name.
