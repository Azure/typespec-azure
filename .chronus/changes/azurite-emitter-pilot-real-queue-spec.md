---
changeKind: fix
packages:
  - "@azure-tools/typespec-azurite-emitter-pilot"
---

Vendored the real, unchanged Azure Storage Queue TypeSpec plus a real `azurite.tsp` overlay citing Azurite's documented `swagger/queue.md` customizations, and fixed three gaps the toy fixture never exercised: `Record<T>` dictionary properties, anonymous-model identity collisions, and real cross-interface operation-name collisions. All 17 real Queue operations now build and render with zero diagnostics.
