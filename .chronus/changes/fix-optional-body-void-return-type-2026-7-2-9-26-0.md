---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Fix return type for operations with optional body response: use `void` instead of `undefined` in union return types (e.g. `Promise<KeyValue | void>` instead of `Promise<KeyValue | undefined>`)
