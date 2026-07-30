---
changeKind: internal
packages:
  - "@azure-tools/typespec-go"
---

Add missing coverage for ARM resource IDs.  Skip test for user-defined errors as we don't yet support this and the test as it currently is validates the wrong thing.