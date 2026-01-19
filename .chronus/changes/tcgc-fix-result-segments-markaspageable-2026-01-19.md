---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@markAsPageable` decorator to populate `method.response.resultSegments` to match the behavior of native pageable operations, ensuring the array of properties to walk to get results from the response model is available.
