---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/azure-http-specs"
---

Add `@lroOperationId` and `SdkLroServiceMetadata.operationId` for legacy services that expose server-issued operation identity through a linked status-monitor URI, its response body, or both. The ordered `SdkLroOperationIdMetadata` entries preserve the selected SDK parameter or effective response property, with `propertySegments` identifying the body access path, including inherited properties and `@hierarchyBuilding` replacements. Active selections are validated during LRO processing; unused or out-of-scope annotations have no effect. Includes emitter scopes and representative Spector scenarios.
