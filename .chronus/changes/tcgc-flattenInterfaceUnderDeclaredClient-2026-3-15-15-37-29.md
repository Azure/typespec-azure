---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix interface flattening for explicit `@client` namespaces - nested interfaces without `@client` or `@operationGroup` contribute operations directly to the parent client.
