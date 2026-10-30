---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Convert inline-discriminated unions with explicit nominal model hierarchies to polymorphic SDK models by default. Set `convertDiscriminatedUnionsToModels: false` in `createSdkContext` to preserve union representations. Ordinary unions and object-envelope unions retain their existing behavior.
