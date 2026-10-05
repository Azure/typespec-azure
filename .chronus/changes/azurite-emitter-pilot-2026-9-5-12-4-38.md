---
changeKind: fix
packages:
  - "@azure-tools/typespec-azurite-emitter-pilot"
---

Fix operations.ts missing imports for model types referenced in request/response bodies, found by running the generated output through Azurite's own tsc build.