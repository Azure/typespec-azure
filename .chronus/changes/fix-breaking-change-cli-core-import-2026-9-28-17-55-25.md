---
changeKind: fix
packages:
  - "@azure-tools/typespec-breaking-change"
---

Stop injecting the removed breaking-change library during CLI compilation. Specifications using approval decorators import Azure.Core explicitly.