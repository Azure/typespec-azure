---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix false `duplicate-client-name` reported when `@client` and `@clientLocation` are mixed on different language scopes. Operations belonging to a `@client` scoped to a specific language are no longer relocated by an inherited `@clientLocation` when validating other scopes.
