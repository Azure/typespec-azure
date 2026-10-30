---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix use-operation-decorator verb agreement for HEAD existence checks, GET resource actions, and GET/POST provider operations. Validate verb overrides on standard ARM templates. Report separate provider diagnostics requiring a provider decorator and GET/POST, without accepting provider-only decorators on resource operations. Explain the required operationType for generic ARM resource decorators and validate every generic decorator, including alongside a public decorator.