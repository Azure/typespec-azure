---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Extend `isExactName` to additional SDK types whose names can be changed by `@clientName`: `SdkClientType`, `SdkServiceMethodBase` (and its derived method kinds), and `SdkEnumValueType`. Also fixed `SdkClientType.name` to strip the internal `exact()` marker.
