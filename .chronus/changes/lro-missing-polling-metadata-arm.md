---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the opt-in `lro-missing-polling-metadata` lint rule for ARM PATCH and provider/collection POST operations returning `202` without native polling metadata. Use asynchronous ARM templates or preserve supported semantic LRO headers.
