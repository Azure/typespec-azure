---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix custom auth scheme models leaking into `definitions` when declared inside the service namespace. They are now emitted only under `securityDefinitions` as expected.
