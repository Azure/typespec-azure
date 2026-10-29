---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix use-operation-decorator verb agreement for HEAD existence checks, GET resource actions, and GET/POST provider operations. Validate verb overrides on standard ARM templates and reject provider-path exemptions for other verbs.