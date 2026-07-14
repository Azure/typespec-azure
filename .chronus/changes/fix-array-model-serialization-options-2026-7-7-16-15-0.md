---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Preserve serialization options on collection/array (and dictionary) models that carry explicit serialization decorators, e.g. `@Xml.name("Foo") model Foo is Bar[];`. Previously the XML name on such models was lost. `SdkArrayType` and `SdkDictionaryType` now expose an optional `serializationOptions` that is populated when the model has explicitly defined XML/JSON serialization info.
