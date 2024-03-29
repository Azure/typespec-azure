---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

SdkUnionType, SdkEnumType, and SdkModelType will now always have a `.name` property. `.isGeneratedName` is now a boolean that expresses whether the `.name` was generated or described in the tsp
