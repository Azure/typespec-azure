---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `list-response-envelope` to count HTTP payload properties and validate next-link correspondence in the selected ARM paging response, including success and default fallbacks.
