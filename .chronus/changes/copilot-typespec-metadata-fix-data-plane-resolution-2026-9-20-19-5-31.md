---
changeKind: fix
packages:
  - "@azure-tools/typespec-metadata"
---

Classify services using ARM provider metadata instead of ARM library imports so data-plane services that use ARM common types remain data-plane.