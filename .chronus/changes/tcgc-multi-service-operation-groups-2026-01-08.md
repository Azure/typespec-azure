---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Allow operation groups to contain operations from multiple services. Operation groups created via `@clientLocation` or automatically merged when multiple services have operation groups with the same name now support multi-service scenarios with empty apiVersions and string API version parameter type.
