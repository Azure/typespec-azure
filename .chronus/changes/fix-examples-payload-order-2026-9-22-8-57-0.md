---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-examples"
---

Preserve request and response payload field order during migration. Retain version-specific variants when only field order changes, including nested objects and array items, and keep response body and headers in their original order.