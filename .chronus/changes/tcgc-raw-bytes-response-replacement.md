---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `replaceResponseWithBytes` to expose raw response bytes instead of base64-encoded bytes while preserving the original HTTP response metadata.
