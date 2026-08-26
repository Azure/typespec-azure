---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Fix fake server route regex to allow path delimiters in captures for `allowReserved` path parameters (e.g. ARM scopes and resource IDs), which are inserted into the request path unescaped and can span multiple path segments.
