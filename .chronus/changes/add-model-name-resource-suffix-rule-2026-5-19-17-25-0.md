---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `model-name-resource-suffix` linter rule that flags model names ending with `Resource` and suggests dropping the suffix or renaming to `Data`/`Info`, per Azure SDK .NET naming conventions. Includes auto-fix codefixes via `@clientName`.
