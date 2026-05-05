---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add common package reference test for `@alternateType` with `ExternalType`. This test demonstrates using `@alternateType` to reference types from a pre-existing typespec-defined common package, where each language emitter specifies its own generated package coordinates. Includes a models-only `common-types` spector package defining an `Address` model.
