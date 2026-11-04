---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Check `list-response-envelope` for all declared list operations, including non-resource lists and lists without continuation-link metadata. Do not infer lists from URL paths. Include inherited envelope properties.
