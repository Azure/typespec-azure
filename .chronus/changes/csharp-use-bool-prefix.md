---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `csharp-use-bool-prefix` linter rule for boolean property and parameter names, enabled in `best-practices:csharp` and `client-sdk`. The rule uses `compromise` to recognize English verb prefixes and separately flags explicit negative words (`not`, `no`, and `never`) to encourage affirmative names. Missing-prefix warnings offer alternative C#-scoped `@@clientName` quick fixes using `Is`, `Has`, `Can`, or `Should`; negative-name warnings require manual review because renaming alone cannot invert boolean values.