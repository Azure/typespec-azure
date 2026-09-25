---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Report nonempty anonymous request body models passed through templates with no-unnamed-types, while preserving authentication and other non-payload template configuration exemptions.