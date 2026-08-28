---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Sanitize spec-provided service names and versions used in output and example paths so they cannot escape their configured directories.
