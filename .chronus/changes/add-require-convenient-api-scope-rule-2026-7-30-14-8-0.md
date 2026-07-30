---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `decorator-requires-scope` validation that warns when `@convenientAPI` is used without a "java" or "csharp" scope, and when `@clientOption` is used without any scope. This subsumes the previous `client-option-requires-scope` diagnostic.
