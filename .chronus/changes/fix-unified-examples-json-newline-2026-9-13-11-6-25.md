---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Append a trailing newline to JSON examples generated from unified YAML examples, preventing formatter failures and newline-only diffs.