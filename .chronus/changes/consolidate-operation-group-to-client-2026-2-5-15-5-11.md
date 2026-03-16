---
changeKind: breaking
packages:
  - "@azure-tools/azure-http-specs"
  - "@azure-tools/typespec-client-generator-core"
---

For multiple service case, remove the use of `@useDependency` to decare each service's API version, but use the latest version instead. Remove related tests.