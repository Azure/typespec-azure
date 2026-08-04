---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Always document raw JSON fields (emitted as `[]byte`) so callers know to marshal their data structure into the bytes.
