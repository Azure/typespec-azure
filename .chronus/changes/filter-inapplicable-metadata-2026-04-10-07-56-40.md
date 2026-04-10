---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Filter out inapplicable metadata properties from model types when `@Http.Private.includeInapplicableMetadataInPayload(false)` is set on the model. This ensures SDK model types for ARM resources exclude `@path` and `@query` decorated properties from the model body, consistent with typespec-autorest behavior.
