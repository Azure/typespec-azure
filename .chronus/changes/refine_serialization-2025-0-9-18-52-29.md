---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `serializationOptions` property to `SdkModelType` and `SdkBodyModelPropertyType`. Its type is `SerializationOptions` which contains the info of how to serialize to Json/Xml/Multipart value.