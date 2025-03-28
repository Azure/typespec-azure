---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Remove deprecated staffs:
1. `UsageFlags.Error` -> `UsageFlags.Exception`
2. `SdkClientType.initialization` -> `SdkClientType.clientInitialization.paramters`
3. `SdkPathParameter.urlEncode` -> `SdkPathParameter.allowReserved`
4. `SdkClientAccessor` -> `SdkClientType.parent`/`SdkClientType.children`
5. `SdkExampleBase.description` -> `SdkExampleBase.doc`