---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Always emit a doc comment noting that the contents of a raw JSON field are raw JSON. Fields that are raw JSON are generated as `[]byte`, and the caller is expected to marshal their data structure into those bytes. Previously the note was only added when the field had no other documentation, so documented raw JSON fields gave no indication of the expected `[]byte` contents.
