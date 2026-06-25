---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-ts"
---

Remove the `branded` and `flavor` emitter options. `@azure-tools/typespec-ts` now only generates Azure-branded packages; use `@typespec/http-client-js` for unbranded emit.
