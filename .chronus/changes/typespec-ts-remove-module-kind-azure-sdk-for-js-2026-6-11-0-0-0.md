---
changeKind: breaking
packages:
  - "@azure-tools/typespec-ts"
---

Remove the `module-kind` and `azure-sdk-for-js` emitter options. Generation now always targets ESM and the Azure SDK for JS monorepo layout. The standalone-package and CommonJS-only generation paths have been removed.
