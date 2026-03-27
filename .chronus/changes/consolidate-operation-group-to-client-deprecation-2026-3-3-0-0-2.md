---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Deprecated `@operationGroup` decorator in favor of `@client`. The `@operationGroup` decorator now delegates to `@client` internally and will be removed in a future release. Use `@client` to define sub clients instead.
