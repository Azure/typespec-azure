---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Use the `catalog:` pnpm workspace specifier for the `tslib` dependency when generating `package.json` for the azure-sdk-for-js monorepo.
