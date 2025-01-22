---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Deprecate `serializedName` property of `SdkEndpointParameter`. Use `type.templateArguments[x].serializedName` or `type.variantTypes[x].templateArguments[x].serializedName` instead.