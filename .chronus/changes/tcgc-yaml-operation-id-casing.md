---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Match unified YAML example operation keys case-insensitively, like legacy JSON examples, while retaining raw example envelopes. Expose an optional example `id` from unified YAML definitions on SDK examples.
