---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-error` lint rule, promoting the LintDiff `LroErrorContent` check to help ARM APIs use consistent error responses. Operations other than HEAD must declare an `@error` response and use `Azure.ResourceManager.CommonTypes.ErrorResponse` for error payloads.
