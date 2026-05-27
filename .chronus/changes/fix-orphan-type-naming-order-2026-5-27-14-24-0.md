---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix orphan type ordering so that models are always processed before unions, ensuring anonymous model variants inside unions get their generated name from the model property context rather than the union context. This restores the naming behavior from 0.68.0 that was inadvertently changed in 0.68.1.
