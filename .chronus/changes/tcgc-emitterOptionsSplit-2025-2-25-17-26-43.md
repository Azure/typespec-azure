---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Split emitter options into `UnbrandedSdkEmitterOptions` and `BrandedSdkEmitterOptions`. Each flag will be exported individually, so emitters can choose which flags to support
