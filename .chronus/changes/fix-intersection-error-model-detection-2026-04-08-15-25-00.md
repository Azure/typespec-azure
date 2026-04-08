---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix error response in intersection types (e.g., `ArmAcceptedResponse & ErrorResponse`) not being classified as exceptions, causing false `unexpected-pageable-operation-return-type` diagnostic for pageable operations.
