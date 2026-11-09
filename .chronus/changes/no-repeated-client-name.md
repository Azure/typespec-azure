---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `no-repeated-client-name` to warn when a common SDK method name repeats its owning subclient name, covering the SDK naming intent of `OperationIdNounVerb`. Renaming a shipped SDK method can break callers.
