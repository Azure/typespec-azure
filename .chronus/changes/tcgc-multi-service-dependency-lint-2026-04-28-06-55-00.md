---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `inconsistent-multiple-service-dependency` warning that is reported when services merged into a single client (via `autoMergeService`) declare diverging `@useDependency` versions for the same shared library (e.g., ARM common-types). Aligning the versions avoids generating duplicated/diverged models in the SDK.
