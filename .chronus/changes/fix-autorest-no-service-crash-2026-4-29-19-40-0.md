---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix crash in autorest emitter when no `@service` is declared but a spec references a model from a versioned namespace (e.g. `CommonTypes.AzureEntityResource`).
