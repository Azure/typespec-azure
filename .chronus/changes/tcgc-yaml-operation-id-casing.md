---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Match unified YAML example operation keys case-insensitively, like legacy JSON examples, while retaining raw example envelopes. Append explicit YAML example IDs to SDK example file paths as `#id`.
