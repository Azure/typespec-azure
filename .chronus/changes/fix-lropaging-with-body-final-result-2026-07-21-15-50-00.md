---
changeKind: fix
packages:
  - "@azure-tools/azure-http-specs"
---

Fix the `postPagingLroWithBody` ARM scenario to declare the LRO final result (`ArmLroLocationHeader<FinalResult = ProductListResult>`) so the accepted response's `location` header points at the paged result type.
