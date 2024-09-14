---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

no longer export the `SdkExampleValueBase` interface. This type should have no usage in downstream consumer's code. If there is any usages, please replace it with `SdkExampleValue`.
