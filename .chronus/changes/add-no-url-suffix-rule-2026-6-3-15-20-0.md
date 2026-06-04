---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `dotnet-no-url-suffix` linter rule that flags model properties ending with `Url` and suggests using `Uri` suffix instead, following .NET SDK naming conventions. Includes auto-fix to add `@@clientName` decorator in client.tsp.
