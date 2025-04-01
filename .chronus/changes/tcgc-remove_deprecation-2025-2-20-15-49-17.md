---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Removed `package-name` and `flatten-union-as-enum` from `SdkEmitterOptions`, `clientNamespace` from `SdkClientType`/`SdkNullableType`/`SdkEnumType`/`SdkUnionType`/`SdkModelType`, `packageName` from `TCGCContext`, `nameSpace` from `SdkClientType`, `name`/`rootNamespace` from `SdkPackage` and `getClientNamespaceString` function. All these things should have been deprecated in previous version or not used by any emitters.