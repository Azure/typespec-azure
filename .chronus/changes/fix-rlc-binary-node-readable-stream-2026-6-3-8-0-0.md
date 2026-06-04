---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Replace `NodeJS.ReadableStream` with the platform-conditional `NodeReadableStream` helper in RLC binary request body unions so generated browser builds no longer fail with TS2503 when `@types/node` is excluded.
