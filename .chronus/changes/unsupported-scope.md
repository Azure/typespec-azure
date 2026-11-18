---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `unsupported-scope` linter rule to catch unsupported scopes on TCGC decorators, with correction hints for `js` or `typescript` instead of `javascript` and `dotnet` instead of `csharp`.
