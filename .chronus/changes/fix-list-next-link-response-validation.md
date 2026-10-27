---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Validate paged list envelopes against HTTP response payload properties so inherited headers, ignored properties, and non-read properties cannot satisfy the required `nextLink` field.
