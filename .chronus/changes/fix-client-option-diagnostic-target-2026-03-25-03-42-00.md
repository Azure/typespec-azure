---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@clientOption` diagnostic target to report on the decorator instead of the target model, enabling proper suppression
