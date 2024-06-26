---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Replace `tspNamespace` with `crossLanguageDefinitionId`.
- Remove `tspNamespace` in `SdkEnumType`, `SdkModelType`, `SdkUnionType`, `SdkArrayType`.
- Add `crossLanguageDefinitionId` to `SdkUnionType` and `SdkArrayType`.
