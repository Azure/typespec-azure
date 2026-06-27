---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Internal refactor: Thread \`binder\` through \`resolveReference\` calls inside \`buildClientContext\` as an explicit dependency, sourced from the \`Effect\` Context layer. This converts previous ambient binder usage into typed, explicit dependency injection.
