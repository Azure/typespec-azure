---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix wrong encode for `bytes` in `HttpPart` for `multipart/form-data`. The encode is now correctly `bytes` instead of `base64`.
