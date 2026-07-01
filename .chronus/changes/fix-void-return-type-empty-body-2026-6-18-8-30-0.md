---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Change return type from `T | undefined` to `T | void` when an operation can return either a body response or an empty body response (e.g. 204 status code).
