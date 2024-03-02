---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

add helper function getCrossLanguagePackageId. getCrossLanguagePackageId returns a package id that is consistent across languages, allowing emitters to identify that they are generating from the same service tsp