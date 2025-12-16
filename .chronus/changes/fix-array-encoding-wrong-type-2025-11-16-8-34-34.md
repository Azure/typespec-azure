---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix using `ArrayEncoding.pipeDelimited` or `ArrayEncoding.spaceDelimited` on parameter would transform the type to string incorrectly
