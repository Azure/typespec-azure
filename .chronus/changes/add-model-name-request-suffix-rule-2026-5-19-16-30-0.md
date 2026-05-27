---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `model-name-request-suffix` linter rule that flags model names ending with `Request` and suggests using `Content` suffix instead, per Azure SDK .NET naming conventions. Includes auto-fix via `@clientName`.
