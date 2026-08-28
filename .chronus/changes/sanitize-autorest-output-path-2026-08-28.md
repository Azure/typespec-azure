---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Sanitize spec-provided service names and versions interpolated into `output-file` so they cannot escape the emitter output directory.
