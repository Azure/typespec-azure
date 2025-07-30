---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Removed type alias: `SdkModelPropertyType` and `SdkParameter`. For the place that used these two aliases, changed to more explicit type, e.g., for the property of `SdkModelType`, the type now is `SdkModelPropertyType` only. Since current model property will never be `SdkHttpParameter`, emitter could not filter them out from a model. Use `isHttpMetadata` instead.
